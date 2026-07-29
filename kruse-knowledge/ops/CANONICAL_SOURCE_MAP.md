# Canonical Source Map

This document explains the machine-readable source map in
[`docs/ops/canonical-source-map.json`](canonical-source-map.json). The JSON is
the reviewable source of truth; this page is the human guide.

Run the audit:

```powershell
node tools/check-canonical-source-map.mjs --check
node tools/check-canonical-source-map.mjs --json
```

Use `--fail-on-gaps` only when a task is meant to block on every known gap. The
normal `--check` validates that each family has a canonical path decision,
Supabase target decision, NotebookLM decision, daily owner decision, and named
follow-up owner for any gap.

## Canonical Matrix

| Family | Canonical saved in | Supabase target | NotebookLM surface | Daily owner | Current gap |
|---|---|---|---|---|---|
| X daily tweets | `scrapers/twitter_to_md/data/<date>.json` | `tweets` via `daily-canonical-sync.js` | Excluded; JSON is staging/input | Backend daily runner X scrape and canonical sync | None |
| Forum daily posts | `scrapers/forum_to_md/daily/<date>.json` | `forum_canonical_threads` via daily merge | Excluded directly; full forum bundles are the source surface | Backend daily runner forum scrape and canonical sync | None |
| Forum full archive | `scrapers/forum_to_md/processed_mds/threads/*.md` | `forum_canonical_threads`, `kruse-archive/forum/threads/` | `forum#N.md` bundles | Manual forum archive run; daily only adds daily posts | Per-thread markdown is missing in this checkout; full archive is not daily refreshed |
| ThreadReader tweet threads | `scrapers/threadreader_to_md/processed_mds/threads/*.md` | `tweet_threads`, `kruse-archive/x/threads/` | `tweet-threads*.md` bundles | Manual only | No daily refresh/import owner; per-thread markdown missing in this checkout |
| LinkedIn articles | `scrapers/linkedin_to_md/processed_mds/articles/*.md` | `linkedin_posts`, `kruse-archive/linkedin/` | `linkedin#N.md` bundles | Manual only | No daily refresh/import owner; per-article markdown missing in this checkout |
| Free blog archive | `scrapers/free_blogs_md/processed_mds/blogs/*.md` | `blog_articles`, `kruse-archive/blogs/free/` | `free-blogs#N.md` by module and `tools/notebooklm-manifest.mjs` | Static/manual PDF conversion | Per-blog markdown is missing in this checkout; committed bundles are selected as public blog sources |
| Private blog/Patreon archive | `private/kemono_to_md/processed_mds/blog_series/**/*.md` | `blog_articles`, `kruse-archive/blogs/private/` after approval | Private/manual bundles only; skipped by public NotebookLM manifest | Manual private archive run only | Private submodule not initialized in this checkout; private/public NotebookLM boundary needs explicit decision |
| Optimal Klubs daily blogs | `summary/kruse-summary/curated/<date>-blogs.json` | `blog_articles` via daily blog state/sync | Excluded; report cards are derived | Backend daily runner blog fetch and canonical sync | None |
| Podcast appearances | `summary/kruse-summary/curated/podcast-canonical-inventory.json` and `<date>-podcasts.json` | `kruse_podcast_transcripts` metadata rows | Metadata excluded until transcript markdown exists | Backend daily runner metadata/Q&A sidecar plus canonical sync | Full podcast discovery inventory is not daily refreshed |
| Podcast transcripts | Target `kruse-archive/podcasts/<year>/<month>/*.md`; current artifacts under `summary/kruse-summary/out/issue-225*/transcripts/` | `kruse_podcast_transcripts`, `kruse-archive/podcasts/` | Included when archive markdown exists | Issue-specific import workers | Issue transcript artifacts are not yet in the canonical archive path or live Supabase import |
| Q&A/PowWow | Daily metadata in `<date>-podcasts.json`; transcript targets `kruse-archive/qna/` and `kruse-archive/powwow/`; issue #451 and #484 status/results in `plans/issue-451-audio-transcript-*.json` and `plans/issue-484-qna-audio-canonical-normalization-result.json` | `kruse_podcast_transcripts`/`media_items`, `kruse-archive/qna|powwow/` | Q&A and PowWow are separate manifest families when transcript markdown exists | Daily metadata only | Issue #484 live-normalized 169 Q&A rows / 105 Q&A transcript Storage objects and 4 issue #450 PowWow rows; issue #451/#474 live-imported 79 PowWow STT rows / 77 transcript objects. Paid STT and future row selection stay separate task-approval boundaries; scoped inserts/upserts within an approved task use the standing approval |
| Webinars | Target `kruse-archive/webinars/<year>/*.md`; issue #451/#484 status/result evidence in `plans/issue-451-audio-transcript-*.json` and `plans/issue-484-qna-audio-canonical-normalization-result.json`; external source root can be `D:/kruse/webinars` | `media_items`, `kruse-archive/webinars/` | Included when transcript markdown exists | None | Issue #451/#474 live-imported 89 webinar STT media rows / 84 transcript objects; issue #484 live-normalized one legacy webinar row/object. Future webinar discovery/import is still not daily-owned; raw audio is deferred by policy |
| NotebookLM exports | Derived manifest/delta from `tools/notebooklm-daily-refresh.mjs`, `tools/notebooklm-drive-publisher.mjs`, and `tools/notebooklm-rclone-sync.mjs` | None by policy | `summary/kruse-summary/out/notebooklm-refresh/<date>/`, `summary/kruse-summary/out/notebooklm-rclone-sync/<date>/`, and stable Drive file IDs in the private registry | Backend daily runner when `NOTEBOOKLM_RCLONE_LIVE=true` for the 114-file Gemini Notebook Drive registry; optional Drive API path when `NOTEBOOKLM_DRIVE_LIVE=true` | NotebookLM Personal/Pro source attachment is not automated; new Drive files must be added individually once; PowWow is selected as its own source family |
| Daily reports | `summary/kruse-summary/out/<date>.html` and `docs/reports/<date>.html` | Target `daily_reports`, `kruse-summary/reports/` | Excluded; reports are derived summaries | Backend daily runner local/public publish | Supabase report archive target exists but is not imported by daily sync |

## Operating Rules

- Source collectors produce canonical per-item files or daily JSON sidecars.
- Bundles, report HTML, NotebookLM manifests, and RAG vectors are derived.
- A newly found usable source item, transcript, source URL, or metadata
  correction is not captured until it is routed to the family named in
  `canonical-source-map.json`.
- For the matching family, use `supabase.tables[].name` and
  `supabase.tables[].conflict_target` for DB upserts, and use
  `supabase.storage_buckets[].bucket` plus `object_prefix` for markdown or
  transcript Storage objects.
- For approved tasks, routine scoped Supabase inserts/upserts and mapped
  Storage object writes are standing-approved. Write the row/object to the
  mapped destination and record readback evidence in the handoff: table/bucket,
  conflict target or object path, source ID, source URL or local path, and
  row/object count. Use a dry-run/import plan only when Guy explicitly chose
  artifact-only/no-live-write, credentials are unavailable, or the write is
  outside the standing approval.
- A chat note, `.codex-tmp` file, issue output folder, report HTML, or
  NotebookLM bundle is not enough by itself for a discovered source.
- Supabase rows should point to canonical source or Storage paths when content
  is large; short daily rows can store compact text or metadata directly.
- Raw audio is not canonical Storage input.
- Daily sync currently writes tweets, forum daily posts, blog updates, and
  podcast/Q&A metadata only.
- Transcript Storage uploads, podcast/media transcript live imports, broad
  discovery, paid STT, NotebookLM UI/source attachment automation, and external
  source changes stay in separate approved tasks. Backend Google Drive file
  refresh for the existing Gemini Notebook source IDs is owned by the daily
  runner when `NOTEBOOKLM_RCLONE_LIVE=true`; the older Drive API path remains
  optional behind `NOTEBOOKLM_DRIVE_LIVE=true`.

## What This Fixes

The previous state let workers say "NotebookLM" or "Supabase" was current while
some families only existed as sidecars, bundles, issue-output transcript files,
or external audio folders. The map makes those differences explicit and gives
future workers a command that names the affected family, local evidence count,
Supabase target, NotebookLM target, daily owner, and next follow-up owner.
