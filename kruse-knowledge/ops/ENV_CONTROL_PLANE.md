# Environment And Secret Control Plane

This is the repo-wide map for environment names after the migration. It is
names-only: never paste secret values into this file, PRs, issue comments, logs,
or screenshots.

GitHub Issues and the GitHub Project are the live task/status source of truth.
Repo files describe the system; they are not the task board.

## Self-Check

List every known env/secret name and expected local file:

```bash
node tools/env-control-plane.mjs --list
node tools/env-control-plane.mjs --list --json
```

Check one execution path against the current shell environment:

```bash
node tools/env-control-plane.mjs --scope daily-normal
node tools/env-control-plane.mjs --scope supabase-status
node tools/env-control-plane.mjs --scope rag-live-proof
node tools/env-control-plane.mjs --scope local-codex --allow-missing
```

The command reports missing names only. It does not print values.

Audit local environment stores by name:

```powershell
.\tools\local-env-guard.ps1 -Mode Audit -Scope local-codex -AllowMissing
.\tools\local-env-guard.ps1 -Mode Audit -Scope daily-normal
```

Create a local encrypted backup before any approved config mutation:

```powershell
.\tools\local-env-guard.ps1 -Mode Backup -Scope local-codex -AllowMissing
```

Backups are written outside the repo under the current Windows user's local app
data directory and store values as PowerShell `SecureString` data encrypted by
Windows DPAPI. The backup command prints names, paths, and counts only.
Restore mode is a dry run unless `-Apply` is passed:

```powershell
.\tools\local-env-guard.ps1 -Mode Restore -BackupFile <backup.clixml>
```

## Local Files

Root `.env` is the canonical local operator env file for Codex/dev runs.
Create it once from the tracked root template:

```powershell
Copy-Item .env.example .env
```

These gitignored files may hold local values:

| Path | Used by | Notes |
|---|---|---|
| `.env` | local Codex/dev runs across summary, scrapers, RAG helpers, and local tooling | Canonical local env file. Put local env values here. |
| `scrapers/forum_to_md/cookies.txt` | legacy forum scraper cookie auth | Alternative to `XENFORO_COOKIE`; never commit it. |
| `scrapers/linkedin_to_md/credentials.txt` | LinkedIn Playwright fallback | Optional discovery fallback only. |

Legacy module `.env` files are fallback-only during migration. Do not add new
local values there:

- `summary/kruse-summary/.env`
- `scrapers/forum_to_md/.env`
- `scrapers/twitter_to_md/.env`
- `rag/local_cli/.env`

## Local Environment Guardrails

Local configuration includes all of these mutable stores:

- Gitignored root `.env`, legacy module `.env`, `cookies.txt`, and
  `credentials.txt` files.
- PowerShell/process environment variables.
- Windows User environment variables.
- Windows Machine environment variables.
- Codex/runtime environment passed into local commands.

These stores are operational config, not disposable scratch. Removing, blanking,
overwriting, or moving any required local config name is an external-impact
operation even when it happens only on the local machine.

Before any approved local config mutation, run a names-only audit and a local
encrypted backup:

```powershell
.\tools\local-env-guard.ps1 -Mode Audit -Scope <scope> -AllowMissing
.\tools\local-env-guard.ps1 -Mode Backup -Scope <scope> -AllowMissing
```

After the mutation, rerun the names-only audit for the affected scope. Do not
run restore with `-Apply`, use direct User/Machine env writes, delete local
`.env`/cookie/credential files, or clear env names unless the approved task
names the exact config names, target store, restore source, verification
command, and rollback plan.

`tools/pr-check.mjs` fails PRs that introduce unapproved destructive config
patterns such as GitHub secret/variable deletion, local env deletion, local
`.env`/cookie/credential file deletion, or direct User/Machine env clearing.
Use `tools/local-env-guard.ps1` as the only repo-supported wrapper for local
env backup and restore behavior.

## GitHub Repository Configuration

Names observed in the repo configuration audit on 2026-06-14:

Secrets configured in GitHub: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`,
`FORUM_PASSWORD`, `FORUM_USERNAME`, `GEMINI_API_KEY`, `GMAIL_APP_PASSWORD`,
`GMAIL_USER`, `KRUSE_BOT_TOKEN`, `OPTIMALKLUBS_PASSWORD`,
`OPTIMALKLUBS_USERNAME`, `OPTIMAL_KLUBS_COOKIE`, `SUPABASE_ACCESS_TOKEN`,
`SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`,
`VOYAGE_API_KEY`, `XAPI_BEARER_TOKEN`.

Variables configured in GitHub: `KRUSE_ADMIN_ALERT_RECIPIENTS`,
`KRUSE_SITE_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `REPORT_TIME_ZONE`, `SUPABASE_CARD_VOTES_TABLE`,
`SUPABASE_CARD_VOTE_COUNTS_VIEW`, `SUPABASE_FEEDBACK_TABLE`,
`SUPABASE_MAILING_LIST_TABLE`.

Referenced but not observed in the names-only GitHub audit:
`KRUSE_ADMIN_ALERT_RECIPIENTS` as a secret, `SUPABASE_DB_POOLER_URL`,
`XENFORO_COOKIE`, `FROM_NAME`, Google Forms/Sheets fallback names, and optional
podcast tuning variables. `XENFORO_COOKIE` is normally refreshed by the daily
forum workflow after a successful login; `SUPABASE_DB_POOLER_URL` is only needed
when direct DB connectivity is blocked.

## Execution Matrix

| Scope | Required names | Alternatives / optional names |
|---|---|---|
| Daily summary normal/force/build-only | `KRUSE_SITE_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_MAILING_LIST_TABLE`, `SUPABASE_FEEDBACK_TABLE`, `SUPABASE_CARD_VOTES_TABLE`, `SUPABASE_CARD_VOTE_COUNTS_VIEW`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_QNA_SUMMARY_STATE_TABLE`, `KRUSE_REQUIRE_QNA_SUMMARY_STATE`, `KRUSE_ADMIN_ALERT_RECIPIENTS`, `ANTHROPIC_API_KEY`, `XAPI_BEARER_TOKEN`, `OPTIMAL_KLUBS_COOKIE`, `OPTIMALKLUBS_USERNAME`, `OPTIMALKLUBS_PASSWORD`, `GEMINI_API_KEY` | Forum auth needs `XENFORO_COOKIE` or `FORUM_USERNAME` plus `FORUM_PASSWORD`. Gmail is not required unless the run is explicitly approved to send email. |
| Daily send-existing | Public site/Supabase variables, `SUPABASE_SERVICE_ROLE_KEY`, `KRUSE_ADMIN_ALERT_RECIPIENTS`; add Gmail only with `--approved-send` or `KRUSE_DAILY_APPROVED_SEND=true` | Does not require scrape/provider secrets. |
| Public site build | `KRUSE_SITE_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, Supabase public table/view vars | Never set `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. |
| Supabase status | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | GitHub Actions may populate process `SUPABASE_URL` from `vars.NEXT_PUBLIC_SUPABASE_URL`; pg_cron status needs `SUPABASE_DB_POOLER_URL`, `SUPABASE_DB_URL`, or `SUPABASE_ACCESS_TOKEN`. |
| Podcast Supabase import | `SUPABASE_SERVICE_ROLE_KEY`; `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | Schema apply needs `SUPABASE_DB_POOLER_URL`, `SUPABASE_DB_URL`, or `SUPABASE_ACCESS_TOKEN`. Execute mode needs separate approval. |
| RAG Supabase index | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VOYAGE_API_KEY` | GitHub Actions may populate process `SUPABASE_URL` from `secrets.SUPABASE_URL` or `vars.NEXT_PUBLIC_SUPABASE_URL`; schema apply needs `SUPABASE_DB_POOLER_URL` or `SUPABASE_DB_URL`. Execute mode needs separate approval. |
| RAG Edge Function | `SUPABASE_ACCESS_TOKEN`, `VOYAGE_API_KEY` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, and `RAG_QUERY_MAX_SPEND_USD` are Edge Function secrets when live answer writing is enabled. |
| RAG live proof | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY` | Do not mark #191 unblocked until these names are available to the approved proof runtime and the live proof is allowed to run. |
| Scrapers | `XAPI_BEARER_TOKEN`; forum auth as above | LinkedIn fallback may use `LINKEDIN_USER` and `LINKEDIN_PASS`. |
| Transcription/podcast | `OPTIMAL_KLUBS_COOKIE`, `OPTIMALKLUBS_USERNAME`, `OPTIMALKLUBS_PASSWORD`, `GEMINI_API_KEY` | `ELEVENLABS_API_KEY` is only for bounded paid STT smoke with explicit approval. |

## Current Findings

- Local Codex shell env did not have the checked production names present during
  this audit. Local commands therefore need repo-root `.env` loading or
  explicit shell exports before live checks.
- GitHub repo secrets now include the urgent RAG names `VOYAGE_API_KEY`,
  `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_URL`, and `ANTHROPIC_API_KEY`.
- The GitHub Actions config doc was stale for RAG, Optimal Klubs, Gemini,
  ElevenLabs, and Supabase DB consumers. Use this file and
  `tools/env-control-plane.mjs` as the current matrix.
- Supabase Edge Function secret names are required separately from GitHub repo
  secrets. GitHub can set them during `RAG Edge Function`, but a names-only
  Supabase project secret audit still requires a valid local Supabase CLI token.
