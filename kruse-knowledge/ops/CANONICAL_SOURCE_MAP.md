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
| X daily tweets | `scrapers/twitter_to_md/data/<date>.json` | `tweets` via `daily-canonical-sync.js` | Excluded; JSON is staging/input | Daily workflow X scrape and canonical sync | None |
| Forum daily posts | `scrapers/forum_to_md/daily/<date>.json` | `forum_canonical_threads` via daily merge | Excluded directly; full forum bundles are the source surface | Daily workflow forum scrape and canonical sync | None |
| Forum full archive | `scrapers/forum_to_md/processed_mds/threads/*.md` | `forum_canonical_threads`, `kruse-archive/forum/threads/` | `forum#N.md` bundles | Manual forum archive run; daily only adds daily posts | Per-thread markdown is missing in this checkout; full archive is not daily refreshed |
| ThreadReader tweet threads | `scrapers/threadreader_to_md/processed_mds/threads/*.md` | `tweet_threads`, `kruse-archive/x/threads/` | `tweet-threads*.md` bundles | Manual only | No daily refresh/import owner; per-thread markdown missing in this checkout |
| LinkedIn articles | `scrapers/linkedin_to_md/processed_mds/articles/*.md` | `linkedin_posts`, `kruse-archive/linkedin/` | `linkedin#N.md` bundles | Manual only | No daily refresh/import owner; per-article markdown missing in this checkout |
| Free blog archive | `scrapers/free_blogs_md/processed_mds/blogs/*.md` | `blog_articles`, `kruse-archive/blogs/free/` | `free-blogs#N.md` by module and `tools/notebooklm-manifest.mjs` | Static/manual PDF conversion | Per-blog markdown is missing in this checkout; committed bundles are selected as public blog sources |
| Private blog/Patreon archive | `private/kemono_to_md/processed_mds/blog_series/**/*.md` | `blog_articles`, `kruse-archive/blogs/private/` after approval | Private/manual bundles only; skipped by public NotebookLM manifest | Manual private archive run only | Private submodule not initialized in this checkout; private/public NotebookLM boundary needs explicit decision |
| Optimal Klubs daily blogs | `summary/kruse-summary/curated/<date>-blogs.json` | `blog_articles` via daily blog state/sync | Excluded; report cards are derived | Daily workflow blog fetch and canonical sync | None |
| Podcast appearances | `summary/kruse-summary/curated/podcast-canonical-inventory.json` and `<date>-podcasts.json` | `kruse_podcast_transcripts` metadata rows | Metadata excluded until transcript markdown exists | Daily workflow metadata/Q&A sidecar plus canonical sync | Full podcast discovery inventory is not daily refreshed |
| Podcast transcripts | Target `kruse-archive/podcasts/<year>/<month>/*.md`; current artifacts under `summary/kruse-summary/out/issue-225*/transcripts/` | `kruse_podcast_transcripts`, `kruse-archive/podcasts/` | Included when archive markdown exists | Issue-specific import workers | Issue transcript artifacts are not yet in the canonical archive path or live Supabase import |
| Q&A/PowWow | Daily metadata in `<date>-podcasts.json`; transcript targets `kruse-archive/qna/` and `kruse-archive/powwow/` | `kruse_podcast_transcripts`/`media_items`, `kruse-archive/qna|powwow/` | Included when transcript markdown exists | Daily metadata only | Transcript creation/import is missing; paid STT remains a separate approval boundary |
| Webinars | Target `kruse-archive/webinars/<year>/*.md`; external source root can be `D:/kruse/webinars` | `media_items`, `kruse-archive/webinars/` | Included when transcript markdown exists | None | No daily/import owner; raw audio is deferred by policy |
| NotebookLM exports | Derived manifest from `tools/notebooklm-manifest.mjs` | None by policy | `.codex-tmp/notebooklm-manifest.json` and selected bundles/transcripts | Manual only | No daily upload/Drive refresh owner; manifest output is not published daily |
| Daily reports | `summary/kruse-summary/out/<date>.html` and `docs/reports/<date>.html` | Target `daily_reports`, `kruse-summary/reports/` | Excluded; reports are derived summaries | Daily workflow local/public publish | Supabase report archive target exists but is not imported by daily sync |

## Operating Rules

- Source collectors produce canonical per-item files or daily JSON sidecars.
- Bundles, report HTML, NotebookLM manifests, and RAG vectors are derived.
- Supabase rows should point to canonical source or Storage paths when content
  is large; short daily rows can store compact text or metadata directly.
- Raw audio is not canonical Storage input.
- Daily sync currently writes tweets, forum daily posts, blog updates, and
  podcast/Q&A metadata only.
- Transcript Storage uploads, podcast transcript live imports, broad discovery,
  paid STT, NotebookLM uploads, and external source changes stay in separate
  approved tasks.

## What This Fixes

The previous state let workers say "NotebookLM" or "Supabase" was current while
some families only existed as sidecars, bundles, issue-output transcript files,
or external audio folders. The map makes those differences explicit and gives
future workers a command that names the affected family, local evidence count,
Supabase target, NotebookLM target, daily owner, and next follow-up owner.
