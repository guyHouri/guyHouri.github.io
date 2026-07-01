# Daily Kruse Pipeline

End-to-end daily workflow for the public Kruse report site and approved mailing-list email send.
This is separate from the NotebookLM archive scrapers: the archive scrapers
produce long-term markdown bundles, while this pipeline produces one daily HTML
report from the last 24 hours of X, forum, and newly surfaced blog activity.

## Current Shape

The active automation is `.github/workflows/daily-kruse-summary.yml`.

- Runs with frequent scheduled attempts around the user-facing target of
  `04:00 Asia/Jerusalem`.
- Uses `REPORT_TIME_ZONE`, default `Asia/Jerusalem`, to choose the report date
  and the local build target time.
- Accepts manual `workflow_dispatch`.
- Accepts external `repository_dispatch` with event type `daily-kruse-summary`.
- Accepts external test `repository_dispatch` with event type
  `daily-kruse-summary-test`.
- Publishes the report for review. It does not send email to the synced mailing
  list until Guy approves the report through a manual `send-existing` or
  `force` run. A temporary test gate can still be enabled with
  `KRUSE_EMAIL_TEST_RECIPIENTS`, but it is not active by default.
- Commits generated daily data, report HTML, mailing-list sync, and website
  files back to `main`.
- Triggers `.github/workflows/ci-cd.yml` after the daily commit.

Manual `send-existing` mode reuses the already-committed curated report for a
date and sends it without scraping again or calling Anthropic again. Use it when
an approved test report should now go to the full mailing list.

Test dispatches use the same workflow and email code, but pass
`KRUSE_EMAIL_TEST_RECIPIENTS` from the dispatch payload. When the test gate is
active, the workflow sends only to those addresses and `summary/kruse-summary/main.js`
does not update `last-sent.json`. A test mail can therefore prove the real
pipeline without marking the production day as sent.

## Date And Time Rules

The report date is not hardcoded. The workflow picks it like this:

1. If a manual or repository-dispatch payload includes `date`, use that exact
   `YYYY-MM-DD`.
2. Otherwise, run `TZ="$REPORT_TIME_ZONE" date +%Y-%m-%d`.
3. Pass that date to the X scraper, forum scraper, input builder, AI summary,
   HTML renderer, email sender, and public-site builder.

The desired product behavior is simple: a reviewable report should be published
around `04:00` Israel time, then the mailing list should wait for Guy's
approval. GitHub's cron syntax is UTC-only, so the YAML uses frequent UTC
triggers around the local 04:00 window and the workflow has a
`Wait until 04:00 Israel time` step. After the first successful scheduled
preparation, `last-prepared.json` makes later scheduled attempts skip before
tests, scraping, Anthropic, or email. After an approved send, `last-sent.json`
blocks duplicate mailing-list delivery. There is no sunrise API in the send
path.

If the workflow does not appear at the scheduled minute, that is not a date
calculation bug by itself. GitHub scheduled workflows can start late or fail to
start. Frequent attempts reduce the risk, but the strongest fix is an external
watchdog, not changing the report-date logic.

## Pipeline Steps

The daily workflow is intentionally linear. If a required step fails, later
steps do not run.

1. Checkout `main`.
2. Pick the target report date and run mode.
3. Run a cheap required-config preflight before installs, scraping, Anthropic,
   Supabase sync, or email sends. This checks the production public URL,
   Supabase vars/secrets, Gmail sender secrets, scraper credentials,
   Anthropic key, and admin alert recipient configuration needed for the
   selected mode. For forum auth, CI should prefer `XENFORO_COOKIE`; the
   username/password pair is only a fallback.
4. On scheduled runs, wait until `04:00` in `REPORT_TIME_ZONE`.
5. If `last-sent.json` says this date was sent, or `last-prepared.json` says the
   scheduled report is already waiting for approval, skip the duplicate attempt
   before tests or API calls.
6. Install and test `twitter_to_md`.
7. Install and test `kruse-summary`.
8. Scrape X as a rolling 24-hour window into
   `scrapers/twitter_to_md/data/<date>.json`.
9. Scrape forum activity into `scrapers/forum_to_md/daily/<date>.json`. If the forum
   is unreachable after retries, write an empty sidecar with `scrape_error`
   and continue so the report still publishes with an explicit forum-failed
   state.
10. Fetch newly published or newly observed Optimal Klubs blog posts into
   `summary/kruse-summary/curated/<date>-blogs.json`, including stripped article text
   for posts selected for that day. The checker targets the stable daily window
   ending at `04:00 Asia/Jerusalem`; modified older posts do not count as new
   blogs.
11. Sync Supabase mailing-list rows into `summary/kruse-summary/mailing_list.json`.
12. Build combined daily input at `summary/kruse-summary/curated/<date>-input.json`,
    including `twitter.tweets`, `forum.posts`, and `blog.posts`.
13. Extract podcast/interview pointers to
    `summary/kruse-summary/curated/<date>-podcasts.json`.
14. Run Anthropic prompt chain and validation for the daily digest.
15. Render `summary/kruse-summary/out/<date>.html`. Blog articles selected by the AI
    appear as normal `Blog Updates` cards; they are not rendered as "new blog
    published" announcements. Podcast/Q&A remains a separate side section. If
    no actionable podcast is found, the report says `No new Jack Kruse
    podcast.`
16. Build the static public site into `summary/kruse-summary/site`.
17. Mirror the static site into `docs`.
18. Commit generated artifacts and push to `main`; unapproved scheduled runs
    also write `summary/kruse-summary/last-prepared.json`.
19. Publish and verify the public report URL for review.
20. Send email only when the run is an approved manual/test send.
21. Write `summary/kruse-summary/last-sent.json` only after approved email
    succeeds.
22. CI/CD runs tests again and deploys `docs` to GitHub Pages only after tests
    pass.

## AI Summary Chain

The report is not one giant prompt. It is a staged chain so each step has one
job:

1. `build-input` collects same-day X, forum, and new blog article items in one
   JSON file.
2. `select-system.md` removes low-signal items and keeps only new protocols,
   mechanisms, concrete cases, cited papers, datasets, new claims, useful forum
   updates, and useful blog-article signals.
3. Code gates remove podcast-only items and enforce minimum priority.
4. `write-system.md` writes source-grounded Twitter, Forum, and Blog cards
   without adding personal opinion.
5. `explain-system.md` repairs unclear medical, scientific, and technical
   language.
6. Code repairs common model formatting mistakes, including missing card
   `source_ids`/`source_urls`, from the already-approved selected items.
7. Blog-series codes such as `CPC#84` and `DM#63` are treated as Kruse archive
   references, not scientific terms and not formal citations.
8. Code validators check source IDs, source quotes, same-day citations,
   citation bibliographic anchors, forum/blog URLs, podcast leakage, duplicate
   cards, and missing explanations.
9. The renderer builds the final HTML from validated JSON.

Forum and blog updates must go through the same select, write, explain, and
verify process as tweets. Forum and blog items are not raw appendices and are
not second-class content.

Podcast and Q&A material is intentionally a side lane. `summarize.js` saves
detected podcast/interview pointers into `curated/<date>-podcasts.json`, code
removes those sources from the digest body, and `build-report.js` renders a
dedicated `Latest Podcast / Q&A Summary` section. A podcast item is actionable
only when the source text says it is a new/live/released recording and includes
a real external URL; vague references, old interviews, and URL-only chatter are
ignored. Until ElevenLabs extraction is connected, that section either shows
the queued source or the exact fallback `No new Jack Kruse podcast.` The future
Q&A ingest should use `KRUSE_QNA_SOURCE_USER=guy.houri`; do not use Daniel's
account for that path.

Optimal Klubs blog updates are source material for the AI digest, not a side
announcement. `npm run fetch-blogs -- --date=<date>` calls the Optimal Klubs
WordPress posts API and writes `curated/<date>-blogs.json`; if
`OPTIMAL_KLUBS_COOKIE` is present, the request is made with Guy Houri's logged
in member cookie, otherwise it falls back to the public posts API. The fetcher
strips HTML/media and stores article text for the new/observed posts. Then
`build-input` adds those posts to `blog.posts`, the curator selects only useful
article signal, and the writer renders selected items as normal `Blog Updates`
cards. If no blog is found or no blog signal passes the gate, the report uses
the normal empty-source card instead of filler.

## Testing Gates

There are two testing gates.

The daily workflow runs:

```text
twitter_to_md: npm test
kruse-summary: npm test
```

The CI/CD workflow repeats the same tests before deploying the public website.

Tests cover the X daily JSON behavior, summary validation repairs, report
rendering behavior, source-link/concept-link behavior, site build behavior,
email recipient filtering, test-send state safety, Supabase form behavior, and
unsubscribe logic. The practical rule is simple: if tests fail, the workflow
must not deploy or run an approved send.

## Failure Behavior

Failure should be boring and visible.

| Failure point | What happens | Why |
|---|---|---|
| Required GitHub Actions vars/secrets are missing | Stop in the preflight step before installs, tests, scrapes, Supabase sync, Anthropic, or email | Missing production configuration should be loud before time or API budget is spent |
| Unit tests fail | Stop before scraping/deploying/approved sending | Broken code should not spend API money or email users |
| X scrape fails | Stop before summary and email | Missing source data makes the report unreliable |
| Forum auth is missing | Stop in preflight before installs, tests, scrapes, Anthropic, or email | The daily forum scraper needs either `XENFORO_COOKIE`, or both `FORUM_USERNAME` and `FORUM_PASSWORD` |
| Forum scrape fails after retries | Continue with an empty `scrapers/forum_to_md/daily/<date>.json` containing `scrape_error`; the report says the forum scrape failed | A transient forum/auth outage should not block report review, but it must be visible |
| Optimal Klubs blog check fails | Stop before summary and email | The daily report should not silently miss a new blog |
| Supabase mailing-list sync fails | Stop before approved send | We do not guess the recipient list |
| Anthropic generation fails | Stop before approved send | No validated report means no send |
| Anthropic output is truncated | Stop before approved send | The JSON is incomplete and cannot be trusted; increase token headroom or compact selection output |
| Validator rejects output | Stop before approved send | Prevents hallucinated, uncited, or unclear cards |
| Anthropic omits a selected card source reference | Repair from the selected item, then validate | Keeps strict provenance without failing on recoverable JSON omissions |
| Gmail send fails | Do not update `last-sent.json` | A retry should still be allowed |
| Workflow failure alert has no admin recipient | The alert helper fails explicitly instead of silently skipping | A red workflow without an alert path must be visible in the run logs |
| Test-recipient send succeeds | Do not update `last-sent.json` | Test mail should not mark the production day as sent |
| Commit or deploy fails before approved send | Mailing list is not sent | The public report must be committed and reachable before delivery |
| GitHub schedule does not start | Supabase watchdog dispatches a backup run; duplicate guards skip if the report is already prepared or sent | GitHub scheduled workflows are best-effort and can be dropped before any job exists |
| GitHub watchdog dispatches recovery | Send an admin alert saying recovery was dispatched | A recovered miss is still an operational incident |

`last-prepared.json` is the duplicate scheduled-build guard while a report waits
for approval. `last-sent.json` is the duplicate-send guard. It is updated only
after a successful approved send, so a failed email attempt can be retried.
Manual `force` mode counts as approval and must be used carefully.

## External Watchdog Dispatch

GitHub scheduled workflows are not a strict cron service. The Daily Kruse
Summary workflow stays scheduled on GitHub, but it must not be the only clock.

Current installed fallback:

- Supabase DB schema: `kruse_internal`.
- Supabase table: `kruse_internal.daily_watchdog_dispatches`.
- Supabase function: `kruse_internal.dispatch_daily_kruse_watchdog`.
- Supabase Vault secret: `github_dispatch_token`.
- Supabase cron jobs:
  - `kruse-daily-watchdog-0430-il-summer` at `30 1 * * *`.
  - `kruse-daily-watchdog-0430-il-winter` at `30 2 * * *`.
- Behavior: Supabase runs both UTC candidates needed for Israel summer/winter
  time. The DB function checks `timezone('Asia/Jerusalem', now())` and only
  dispatches inside `04:25-04:45` Israel time. It sends a GitHub
  `repository_dispatch` to `Daily Kruse Summary` with `mode=normal` and
  `date=<today>`.
- Duplicate safety: the GitHub workflow still has `concurrency`,
  `last-prepared.json`, and `last-sent.json`, so a backup dispatch does not
  repeatedly rebuild or double-send. If the report is already prepared or sent,
  the GitHub run exits before tests, scrapes, Anthropic, email, or deploy. The
  GitHub watchdog also checks both state files before dispatching its own
  recovery run.
- Alerting: if the GitHub watchdog has to dispatch a recovery run, it sends an
  admin alert. If the daily workflow itself fails after it starts, its failure
  alert sends separately.

This is server-side and does not depend on Codex, this computer, or any local
process being open.

The fallback is now reproducible from the repo:

```powershell
gh workflow run "Supabase Daily Watchdog" --ref main -f apply=true
gh workflow run "Supabase Status" --ref main
```

The installer applies
`summary/kruse-summary/supabase/daily-watchdog-dispatch.sql` through either a
reachable Postgres URL or Supabase's Management API. The status workflow runs
`summary/kruse-summary/supabase/daily-watchdog-status.sql` and must fail if it
cannot inspect pg_cron, if the Vault token is missing, if the jobs are inactive
or stale, or if the latest GitHub `repository_dispatch` HTTP response is not
`204`.

Required GitHub secrets for repair/status:

- `SUPABASE_ACCESS_TOKEN` for the Management API fallback.
- `SUPABASE_SERVICE_ROLE_KEY` for read-only REST status.
- `SUPABASE_DB_URL` or `SUPABASE_DB_POOLER_URL` when direct Postgres checks are
  used.

Required Supabase Vault secret:

```sql
-- Run in Supabase SQL editor when rotating the token.
-- Do not commit the token value.
select vault.create_secret('<github-token>', 'github_dispatch_token');
```

## Supabase Watchdog Dispatch

Yes, Supabase can dispatch the GitHub daily workflow. The repo side is already
ready because `.github/workflows/daily-kruse-summary.yml` listens for:

```yaml
repository_dispatch:
  types: [daily-kruse-summary]
```

GitHub's repository-dispatch endpoint is the correct outside-GitHub trigger:

```http
POST https://api.github.com/repos/guyHouri/kruse-knowledge/dispatches
```

Payload:

```json
{
  "event_type": "daily-kruse-summary",
  "client_payload": {
    "mode": "normal",
    "date": ""
  }
}
```

Supabase has two good ways to do the watchdog:

1. Supabase Cron plus `pg_net` calls GitHub directly.
2. Supabase Cron calls an Edge Function, and the Edge Function calls GitHub.

Use the Edge Function path if we want more logic, logging, and cleaner secret
handling. Use direct `pg_net` only for the smallest possible implementation.

Required server-only secret:

```text
GITHUB_DISPATCH_TOKEN
```

That token needs permission to create a repository dispatch for
`guyHouri/kruse-knowledge`. It must live in Supabase Vault or Edge Function
secrets. It must never be placed in static HTML, `NEXT_PUBLIC_*`, or a browser
form.

Recommended watchdog timing:

```text
04:45 Asia/Jerusalem daily
```

That gives the normal 04:00 Israel run time to start and finish. The watchdog
should dispatch only when today's report has not been sent/deployed.
The safest long-term check is a Supabase table:

```sql
create table if not exists public.kruse_daily_runs (
  report_date date primary key,
  status text not null,
  github_run_id bigint,
  report_url text,
  sent_at timestamptz,
  deployed_at timestamptz,
  error text,
  updated_at timestamptz not null default now()
);
```

Then the daily workflow should upsert:

```text
started -> scraped -> summarized -> sent -> deployed
```

If the watchdog sees no row for today, or a stale row before `sent`, it sends
the repository dispatch. Duplicate protection still exists in GitHub
concurrency and `last-sent.json`, but the run-status table makes failures
obvious from Supabase.

Current repo status: the GitHub workflow can receive the Supabase dispatch now,
and the Supabase-side scheduled watchdog is installed. A forced test dispatch
returned HTTP `204` from GitHub and produced a `repository_dispatch` run that
skipped safely because `last-sent.json` already had today's date.

## Supabase Test Dispatch

The test path is server-side too. It does not depend on Codex or this computer.

Current installed test trigger:

- Supabase table: `kruse_internal.daily_test_dispatches`.
- Supabase function: `kruse_internal.dispatch_daily_kruse_test`.
- GitHub event type: `daily-kruse-summary-test`.
- Default mode: `send-existing`, so it reuses the committed report and does not
  scrape X, scrape forum, or call Anthropic.
- Default recipient: `guy.houri2024@gmail.com`.
- Safety: the GitHub workflow passes the recipient into
  `KRUSE_EMAIL_TEST_RECIPIENTS`, so `code/email.js` sends only to that address.
  `main.js` sees the test gate and skips the `last-sent.json` update.

Run a test mail from Supabase SQL:

```sql
select *
from kruse_internal.dispatch_daily_kruse_test(
  'guy.houri2024@gmail.com',
  null
);
```

Run a test mail for a specific already-generated report date:

```sql
select *
from kruse_internal.dispatch_daily_kruse_test(
  'guy.houri2024@gmail.com',
  date '2026-05-30'
);
```

Equivalent GitHub dispatch payload:

```json
{
  "event_type": "daily-kruse-summary-test",
  "client_payload": {
    "mode": "send-existing",
    "date": "2026-05-30",
    "source": "supabase-test",
    "test_recipients": "guy.houri2024@gmail.com"
  }
}
```

This is the recommended test before opening delivery to the full mailing list.

## Medical And Science Explanation Policy

The explainer should not waste space teaching the reader the Kruse basics every
day. These are baseline concepts and should usually not get glossary treatment:

- blue light;
- nnEMF;
- deuterium;
- deuterium-depleted water;
- sunrise;
- cold exposure;
- DHA;
- grounding;
- magnetism;
- redox;
- leptin signaling;
- decentralized medicine;
- biophysics of patients.

The explainer should explain harder medical, anatomical, biochemical,
pharmacological, and physics terms when they are necessary to understand the
card. Examples:

- conditions: hypothyroidism, GERD, hiatal hernia, autoimmune thyroiditis;
- anatomy: lower esophageal sphincter, vagus nerve, thyroid gland;
- drugs and compounds: doxycycline, 5-FU, ivermectin, fenbendazole, mastic gum;
- lab or measurement terms: TSH, free T3, ferritin, inflammatory markers;
- mechanisms: mitochondrial complex IV, cytochrome c oxidase, dielectric
  constant, isotope effect, bicarbonate secretion, proton tunneling;
- unclear Kruse-style phrases: water table collapse, lattice lock, optical
  switch, charge separation.

If a baseline Kruse word appears inside a harder mechanism, explain the harder
mechanism rather than the baseline word. For example:

- Explain `kinetic isotope effect`, not just `deuterium`.
- Explain `dielectric collapse`, not just `blue light`.
- Explain `lower esophageal sphincter tone`, not just `GERD`.

The target reader is smart but not a doctor. A good explanation should say:

1. what the term means in normal language;
2. what system it belongs to;
3. why it matters for this specific card;
4. whether the source text actually supports the mechanism or only asserts it.

The verifier should reject cards where the main claim depends on an unexplained
medical/science term or an unclear private phrase. The repair step should add a
plain-language definition or rewrite the sentence. If the source itself does
not provide enough information to explain the phrase, the card should say that
plainly or be dropped.

## Citation Policy

The report citation box is only for real, checkable research references. Source
links already cover tweets and forum posts, so a vague phrase like "a narrative
review", "a study", "a paper", or "a review in Clinical Bioenergetics" is not
enough.

A formal citation must carry bibliographic anchors such as author/researcher
plus year, journal/source plus year, author/researcher plus journal/source,
paper title plus year, DOI, PMID, PMCID, arXiv ID, or clinical-trial ID. If a
source only mentions a review without those anchors, the pipeline may summarize
the source-bound claim but keeps `citations: []` and does not render it as a
research citation.

## Manual Operations

Run the daily workflow from GitHub CLI:

```powershell
gh workflow run "Daily Kruse Summary" --repo guyHouri/kruse-knowledge --ref main -f mode=force -f date=2026-05-27
gh workflow run "Daily Kruse Summary" --repo guyHouri/kruse-knowledge --ref main -f mode=send-existing -f date=2026-05-27
```

Repository-dispatch fallback:

```powershell
'{"event_type":"daily-kruse-summary","client_payload":{"mode":"force","date":"2026-05-27"}}' |
  gh api repos/guyHouri/kruse-knowledge/dispatches --method POST --input -
```

Local equivalent:

```powershell
cd "D:\kruse\guy export\scrapers\twitter_to_md"
npm.cmd install
node main.js --date=2026-05-27

cd "..\forum_to_md"
npm.cmd install
node main-daily.js --date=2026-05-27 --force

cd "..\..\summary\kruse-summary"
npm.cmd install
npm.cmd test
npm.cmd run sync-mailing-list
node code/build-input.js 2026-05-27
node main.js --force --use-ai --date=2026-05-27
npm.cmd run build-site
```

Check generated files:

```text
scrapers/twitter_to_md/data/<date>.json
scrapers/forum_to_md/daily/<date>.json
summary/kruse-summary/curated/<date>-input.json
summary/kruse-summary/curated/<date>.json
summary/kruse-summary/out/<date>.html
docs/reports/<date>.html
```

Public site:

```text
https://guyhouri.github.io/kruse-knowledge/
```
