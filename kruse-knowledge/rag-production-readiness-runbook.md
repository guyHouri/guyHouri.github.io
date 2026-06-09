# RAG Production Readiness Runbook

Status as of 2026-06-08: production readiness is not a label to infer from one
green workflow. Promote the RAG system state only when the matching checks below
are complete and the evidence is recorded in the PR, issue, or handoff note.

## State Ladder

Use these exact states when reporting production RAG progress:

1. `local demo`
   - `rag` package tests pass.
   - Local provider-free demo index builds from `rag/sample-corpus.json`.
   - Local demo query returns cited fixture evidence.
2. `schema/RPC ready`
   - `rag/supabase/migrations/001_rag_schema_rpc.sql` has been applied to the
     production Supabase project.
   - `rag_search(query_text, query_embedding, filters, match_count)` exists and
     can be called by the indexing smoke.
3. `tiny smoke indexed`
   - A live indexing run completed with a deliberately tiny cap, such as
     `max_chunks=1`.
   - This proves secrets, Voyage embeddings, Supabase writes, and `rag_search`
     wiring, but it does not prove useful corpus coverage.
4. `partial index`
   - A live indexing run completed with more than the tiny smoke cap but less
     than all discovered chunks.
   - Report chunk count, spend, skipped existing count, and smoke query result.
5. `full embeddings complete`
   - A live indexing run completed with `max_chunks=0`, which means all
     discovered chunks.
   - The run stayed inside the approved spend cap and uploaded
     `rag-index-result.json`.
6. `Edge Function deployed`
   - GitHub Actions workflow `RAG Edge Function` completed successfully after
     setting Edge Function secrets and deploying `rag-research`.
   - The deployed endpoint is
     `https://zpxhovwsswnjdjibcvsh.supabase.co/functions/v1/rag-research`.
7. `UI live smoke green`
   - GitHub Pages has the mirrored RAG UI at
     `https://guyhouri.github.io/kruse-knowledge/rag/`.
   - A browser or HTTP smoke sends a real query through the live Edge Function
     and receives a successful cited response or a valid source-bound no-match
     response.
8. `production-ready`
   - States 1 through 7 are complete.
   - The final handoff includes the full index run ID, Edge Function deploy run
     ID, UI smoke evidence, and any known caveats.

## Known Truth On 2026-06-08

- The old successful live index run was only a 1-chunk smoke. Treat that as
  `tiny smoke indexed`, not `full embeddings complete`.
- Full indexing run `27136116227` was started with `max_chunks=0` and a `$25`
  spend cap. Use the completed run artifact and summary before promoting to
  `full embeddings complete`.
- Edge Function deployment was blocked by an invalid `SUPABASE_ACCESS_TOKEN`
  until that GitHub secret was fixed. Do not promote to `Edge Function deployed`
  from a failed deploy attempt.

## Full Index Workflow Inputs

Run GitHub Actions workflow `RAG Supabase Index` manually with these production
full-index inputs:

```text
execute: true
apply_schema: true
max_chunks: 0
target_words: 1000
overlap_words: 120
max_estimated_spend_usd: 25
smoke_query: DDW redox mitochondria
```

Operational notes:

- `max_chunks=0` means all discovered chunks.
- `execute=true` is the live Voyage embedding and Supabase upsert boundary.
- `apply_schema=true` lets the workflow apply the current schema/RPC migration
  before indexing.
- The workflow refuses to exceed `max_estimated_spend_usd`.
- Required secrets/vars include `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` or `SUPABASE_DB_POOLER_URL`,
  and `VOYAGE_API_KEY`.

## Edge Deploy Workflow

Run GitHub Actions workflow `RAG Edge Function` after confirming the GitHub
secret `SUPABASE_ACCESS_TOKEN` is valid for project `zpxhovwsswnjdjibcvsh`.

The workflow has no manual inputs. It requires:

```text
SUPABASE_ACCESS_TOKEN
VOYAGE_API_KEY
```

The workflow sets Edge Function secrets:

```text
VOYAGE_API_KEY
RAG_QUERY_MAX_SPEND_USD=0.02
```

Then it deploys:

```text
supabase functions deploy rag-research --project-ref zpxhovwsswnjdjibcvsh --no-verify-jwt
```

## Verification Checklist

Before saying `production-ready`, record:

- `rag` tests: command and result.
- Full index workflow run ID and completion state.
- Full index inputs, especially `max_chunks=0` and
  `max_estimated_spend_usd=25`.
- Full index artifact summary: discovered chunks, embedded chunks, skipped
  existing chunks, estimated spend, and smoke query result.
- Edge Function workflow run ID and completion state.
- Confirmation that the prior invalid `SUPABASE_ACCESS_TOKEN` blocker is fixed.
- Live UI URL smoke result from
  `https://guyhouri.github.io/kruse-knowledge/rag/`.

## Failure Handling

- If the full index run fails before embedding all discovered chunks, report the
  state as `partial index` or keep the prior state.
- If Edge deploy fails with an authentication error, rotate or replace
  `SUPABASE_ACCESS_TOKEN` and rerun `RAG Edge Function`.
- If UI smoke reaches the page but not the backend, verify the deployed Edge
  Function URL, CORS origin, `VOYAGE_API_KEY`, Supabase secret key availability,
  and that `rag_search` exists in production.
- If the smoke query returns no citations after a full index, keep the system
  below `production-ready` until retrieval quality or source coverage is
  explained.
