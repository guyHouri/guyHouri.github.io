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
```

Check one execution path against the current shell environment:

```bash
node tools/env-control-plane.mjs --scope daily-normal
node tools/env-control-plane.mjs --scope supabase-status
node tools/env-control-plane.mjs --scope rag-live-proof
node tools/env-control-plane.mjs --scope local-codex --allow-missing
```

The command reports missing names only. It does not print values.

## Local Files

These files are gitignored and may hold local values:

| Path | Used by | Notes |
|---|---|---|
| `summary/kruse-summary/.env` | daily summary, email, site, Supabase, podcast/transcript tooling | Main local operator env file. |
| `scrapers/forum_to_md/.env` | daily forum login | `FORUM_USERNAME` and `FORUM_PASSWORD`. |
| `scrapers/forum_to_md/cookies.txt` | legacy forum scraper cookie auth | Alternative to `XENFORO_COOKIE`; never commit it. |
| `scrapers/twitter_to_md/.env` | X/Twitter scrape | `XAPI_BEARER_TOKEN`. |
| `scrapers/linkedin_to_md/credentials.txt` | LinkedIn Playwright fallback | Optional discovery fallback only. |
| `rag/local_cli/.env` | local derived-index RAG CLI | Can fall back to `summary/kruse-summary/.env`. |

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
| Daily summary normal/force/build-only | `KRUSE_SITE_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_MAILING_LIST_TABLE`, `SUPABASE_FEEDBACK_TABLE`, `SUPABASE_CARD_VOTES_TABLE`, `SUPABASE_CARD_VOTE_COUNTS_VIEW`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `KRUSE_ADMIN_ALERT_RECIPIENTS`, `ANTHROPIC_API_KEY`, `XAPI_BEARER_TOKEN`, `OPTIMAL_KLUBS_COOKIE`, `OPTIMALKLUBS_USERNAME`, `OPTIMALKLUBS_PASSWORD`, `GEMINI_API_KEY` | Forum auth needs `XENFORO_COOKIE` or `FORUM_USERNAME` plus `FORUM_PASSWORD`. |
| Daily send-existing | Public site/Supabase variables, Gmail, `SUPABASE_SERVICE_ROLE_KEY`, `KRUSE_ADMIN_ALERT_RECIPIENTS` | Does not require scrape/provider secrets. |
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
  this audit. Local commands therefore need module `.env` loading or explicit
  shell exports before live checks.
- GitHub repo secrets now include the urgent RAG names `VOYAGE_API_KEY`,
  `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_URL`, and `ANTHROPIC_API_KEY`.
- The GitHub Actions config doc was stale for RAG, Optimal Klubs, Gemini,
  ElevenLabs, and Supabase DB consumers. Use this file and
  `tools/env-control-plane.mjs` as the current matrix.
- Supabase Edge Function secret names are required separately from GitHub repo
  secrets. GitHub can set them during `RAG Edge Function`, but a names-only
  Supabase project secret audit still requires a valid local Supabase CLI token.
