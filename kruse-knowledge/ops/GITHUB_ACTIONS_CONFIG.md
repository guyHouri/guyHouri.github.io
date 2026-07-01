# GitHub Actions Repo Configuration Audit

Last audited: 2026-06-14

Scope: repository variables and secrets for `guyHouri/kruse-knowledge`. This is
a documentation/proposal audit only. Do not delete, rename, or move any GitHub
configuration without an explicit follow-up approval.

The audit used `gh variable list --json name,updatedAt`,
`gh secret list --json name,updatedAt`, workflow inspection, and static
reference checks. Secret values were not printed or inspected.

## Current Variables

| Name | Classification | Current consumers | Recommendation | Safety notes |
|---|---|---|---|---|
| `KRUSE_ADMIN_ALERT_RECIPIENTS` | Public-ish variable; email addresses may still be private | `Daily Kruse Summary` failure alert step via `vars.KRUSE_ADMIN_ALERT_RECIPIENTS` fallback | Keep for now; consider moving to a secret if recipient privacy matters | Alerting is optional. The workflow also checks unconfigured legacy aliases `secrets.KRUSE_ADMIN_ALERT_RECIPIENTS`, `secrets.KRUSE_ADMIN_EMAIL`, and `vars.KRUSE_ADMIN_EMAIL`. |
| `KRUSE_SITE_PUBLIC_BASE_URL` | Public variable | `Daily Kruse Summary` email/report links and site build | Keep | Required by daily report send/build and public site build. Must remain `https://guyhouri.github.io/kruse-knowledge` for production. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public browser key variable | `Daily Kruse Summary` public site build | Keep | Required for deployed Supabase-backed public forms. Must be a publishable/anon key, never a service-role key. RLS must protect public tables. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public variable | `Daily Kruse Summary` mailing-list sync fallback and public site build; `Supabase Status` fallback | Keep; make this the single GitHub Actions Supabase URL source | This is not a secret. It can replace the duplicated `SUPABASE_URL` secret in Actions once cleanup is approved. |
| `REPORT_TIME_ZONE` | Public variable | `Daily Kruse Summary` date selection, 04:00 wait, blog fetch, report build | Keep | Default is `Asia/Jerusalem`; keeping the variable makes schedule behavior explicit. |
| `SUPABASE_CARD_VOTES_TABLE` | Public variable | `Daily Kruse Summary` public site build; `Supabase Status` | Keep | Required by the current site build preflight. |
| `SUPABASE_CARD_VOTE_COUNTS_VIEW` | Public variable | `Daily Kruse Summary` public site build; `Supabase Status` | Keep | Required by the current site build preflight. |
| `SUPABASE_FEEDBACK_TABLE` | Public variable | `Daily Kruse Summary` public site build; `Supabase Status` | Keep | Required by the current site build preflight. |
| `SUPABASE_MAILING_LIST_TABLE` | Public variable | `Daily Kruse Summary` mailing-list sync and public site build; `Supabase Status` | Keep | Required by the current daily workflow preflight. |

## Current Secrets

| Name | Classification | Current consumers | Recommendation | Safety notes |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | `Daily Kruse Summary` AI report build/send | Keep | Required for `--use-ai` daily report generation. Avoid local/API-spend tests unless explicitly approved. |
| `ELEVENLABS_API_KEY` | Secret | Bounded manual `qna-stt-smoke` path in `Daily Kruse Summary` | Keep, but only for explicitly approved paid STT smoke | Do not use in normal tests or production runs without the paid-run confirmation input. |
| `FORUM_PASSWORD` | Secret | `Daily Kruse Summary` forum scrape | Keep | Required with `FORUM_USERNAME` for logged-in forum daily scrape. |
| `FORUM_USERNAME` | Secret/account identifier | `Daily Kruse Summary` forum scrape | Keep | Required with `FORUM_PASSWORD`. It is not a password, but keeping it secret avoids exposing the login identity. |
| `GMAIL_APP_PASSWORD` | Secret | `Daily Kruse Summary` email send and failure alerts | Keep | Required for subscriber email and admin alerts. |
| `GMAIL_USER` | Secret/account identifier | `Daily Kruse Summary` email send and failure alerts | Keep | Could technically be a variable, but keeping it as a secret avoids exposing the sender account and avoids workflow churn. |
| `GEMINI_API_KEY` | Secret | Daily podcast transcript fallback when `KRUSE_PODCAST_USE_GEMINI_YOUTUBE` is true | Keep | Current daily workflow defaults the Gemini YouTube fallback on. |
| `KRUSE_BOT_TOKEN` | Secret | Daily workflow pushes and forum-cookie refresh fallback | Keep | Needed when the default GitHub token is insufficient for the bot-owned write path. |
| `OPTIMAL_KLUBS_COOKIE`, `OPTIMALKLUBS_USERNAME`, `OPTIMALKLUBS_PASSWORD` | Secrets | Daily Optimal Klubs blog/Q&A fetch and Q&A STT smoke | Keep | `workflow-preflight.js` requires these for normal daily runs. |
| `SUPABASE_ACCESS_TOKEN` | Secret | RAG Edge Function deploy, Supabase status/watchdog Management API fallback, podcast schema fallback | Keep | Must be a Supabase personal access token; never print it. |
| `SUPABASE_DB_URL` | Secret | RAG index schema apply, Supabase status/watchdog pg_cron checks, podcast schema apply | Keep | Prefer `SUPABASE_DB_POOLER_URL` as an additional secret if direct DB access is unreachable. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | `Daily Kruse Summary` server-side mailing-list sync; `Supabase Status` read-only checks | Keep | Server-only. Never expose in `NEXT_PUBLIC_*`, static HTML, PR bodies, logs, or screenshots. |
| `SUPABASE_URL` | Secret, but value is only a project URL | `Supabase Status` primary URL; local code expects this env for local server-side runs | Combine/remove candidate for GitHub Actions | In Actions, prefer `vars.NEXT_PUBLIC_SUPABASE_URL`. The status workflow already falls back to that variable, and daily mailing-list sync already receives the public URL as `NEXT_PUBLIC_SUPABASE_URL`. Keep local `.env` guidance for `SUPABASE_URL`. |
| `VOYAGE_API_KEY` | Secret | RAG Supabase index and RAG Edge Function query embeddings | Keep | Paid provider calls still require explicit execute/live-proof approval. |
| `XAPI_BEARER_TOKEN` | Secret | `Daily Kruse Summary` X/Twitter scrape | Keep | Required for daily X scrape unless running `send-existing`. |

## Referenced But Not Currently Configured

These names are referenced by workflows or docs but were not present in the
current repo variable/secret lists from this audit.

| Name(s) | Expected type | Current consumers | Recommendation | Safety notes |
|---|---|---|---|---|
| `SUPABASE_DB_POOLER_URL` | Secret | Optional Supavisor/session-pooler fallback for DB checks/schema apply | Add if direct DB connection is unreliable | Not observed in the 2026-06-14 names-only GitHub secret list. |
| `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`, `GOOGLE_SHEET_ID`, `GOOGLE_FORM_RESPONSES_CSV_URL` | Secrets | `Daily Kruse Summary` mailing-list sync fallback | Remove workflow references in a follow-up if Supabase is now the only signup source | These are legacy Google Forms/Sheets fallback paths. Current Supabase sync is primary. |
| `GOOGLE_SHEET_RANGE` | Public variable | `Daily Kruse Summary` mailing-list sync fallback | Remove workflow reference with the Google fallback cleanup, or document only as legacy | Defaults locally to `Form Responses 1!A:Z`. |
| `KRUSE_GOOGLE_FORM_PUBLIC_URL`, `KRUSE_GOOGLE_FORM_ACTION`, `KRUSE_GOOGLE_FORM_ENTRY_TYPE`, `KRUSE_GOOGLE_FORM_ENTRY_NAME`, `KRUSE_GOOGLE_FORM_ENTRY_EMAIL`, `KRUSE_GOOGLE_FORM_ENTRY_FREQUENCY`, `KRUSE_GOOGLE_FORM_ENTRY_REPORT_DATE`, `KRUSE_GOOGLE_FORM_ENTRY_REPORT_URL`, `KRUSE_GOOGLE_FORM_ENTRY_RATING`, `KRUSE_GOOGLE_FORM_ENTRY_FEEDBACK` | Public variables | `Daily Kruse Summary` public site build as Google Forms fallback | Remove workflow references in a follow-up if Supabase-backed forms are permanent | Current workflow preflight requires Supabase forms, so these are fallback-only and not needed for the active path. |
| `FROM_NAME` | Public variable | Failure alert step only | Leave unconfigured; fallback is `Kruse Daily` | Only needed if sender display name should differ. |
| `KRUSE_ADMIN_EMAIL` | Public variable or secret alias | Failure alert fallback alias | Rename/remove candidate | Prefer the canonical `KRUSE_ADMIN_ALERT_RECIPIENTS`; keeping both aliases invites drift. |
| `KRUSE_ADMIN_ALERT_RECIPIENTS` as a secret | Secret alias | Failure alert fallback before the variable | Optional move target | If recipient privacy matters, move the configured variable into this secret and remove the variable later. |

## Proposed Cleanup Plan

1. Keep the required active-path configuration:
   `KRUSE_SITE_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `REPORT_TIME_ZONE`,
   the four Supabase table/view variables, `ANTHROPIC_API_KEY`,
   `FORUM_USERNAME`, `FORUM_PASSWORD`, `GMAIL_USER`,
   `GMAIL_APP_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, and
   `XAPI_BEARER_TOKEN`.
2. Consolidate GitHub Actions Supabase URL handling around
   `vars.NEXT_PUBLIC_SUPABASE_URL`. After approval, remove the repo secret
   `SUPABASE_URL` if `Supabase Status` still passes with the variable fallback.
3. Keep `ELEVENLABS_API_KEY` only for explicitly approved bounded STT smoke and
   keep `SUPABASE_DB_URL` for DB-backed Supabase checks/schema apply until the
   pooler/Management API fallback path is proven enough to replace it.
4. Decide whether admin alert recipients are public enough for a repo variable.
   If not, move them to `secrets.KRUSE_ADMIN_ALERT_RECIPIENTS` and remove the
   variable after confirming alerts still send.
5. If Supabase forms are now permanent, remove the unconfigured Google
   Forms/Sheets fallback environment entries from the daily workflow in a
   separate workflow-change PR with `npm run prod-check`.

## Required Workflow Map

| Workflow | Required active-path variables | Required active-path secrets | Optional/fallback names |
|---|---|---|---|
| `Daily Kruse Summary` | `KRUSE_SITE_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `REPORT_TIME_ZONE`, `SUPABASE_MAILING_LIST_TABLE`, `SUPABASE_FEEDBACK_TABLE`, `SUPABASE_CARD_VOTES_TABLE`, `SUPABASE_CARD_VOTE_COUNTS_VIEW` | `ANTHROPIC_API_KEY`, `FORUM_USERNAME`, `FORUM_PASSWORD`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `XAPI_BEARER_TOKEN`, `OPTIMAL_KLUBS_COOKIE`, `OPTIMALKLUBS_USERNAME`, `OPTIMALKLUBS_PASSWORD`, `GEMINI_API_KEY` | `XENFORO_COOKIE`, `KRUSE_ADMIN_ALERT_RECIPIENTS`, `FROM_NAME`, Google Forms/Sheets fallback names |
| `Supabase Status` | `NEXT_PUBLIC_SUPABASE_URL`, Supabase table/view variables | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_URL` secret is currently used first but can be consolidated away |
| `RAG Supabase Index` | `NEXT_PUBLIC_SUPABASE_URL` fallback only | `SUPABASE_SERVICE_ROLE_KEY`, `VOYAGE_API_KEY` | Schema apply also needs a reachable `SUPABASE_DB_POOLER_URL` or `SUPABASE_DB_URL`; the pooler URL is optional but recommended when direct DB access fails |
| `RAG Edge Function` | None | `SUPABASE_ACCESS_TOKEN`, `VOYAGE_API_KEY` | `ANTHROPIC_API_KEY` is set as an Edge Function secret when available for live answer writing; Edge Function secrets are separate from GitHub repo secrets and are set by the dispatch workflow |
| `CI/CD` | None | None | Deploy uses GitHub-provided Pages/OIDC permissions, not repo secrets |
| `PR Guard` | None | None | Uses only PR body and static repository scans |

## Safety Rules

- Never set `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
- Never put `SUPABASE_SERVICE_ROLE_KEY`, API tokens, cookies, Gmail app
  passwords, forum credentials, or Google service-account JSON in variables,
  docs with real values, PR bodies, logs, or screenshots.
- Do not remove configured repo secrets/variables from this audit alone.
  Convert each deletion or rename into an explicit follow-up task with a green
  workflow run proving the active path still works.
