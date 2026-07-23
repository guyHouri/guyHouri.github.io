# NotebookLM Daily Refresh

This runbook defines the safe daily NotebookLM path for `kruse-knowledge`.

There is no assumed NotebookLM notebook. A NotebookLM Personal/Pro notebook also
does not attach a Google Drive folder as one live source. The safe setup is:
create stable Google Drive files, add those individual Drive files to a
NotebookLM notebook once, and then update the same Drive file IDs during daily
refreshes.

This follows the #435 research recommendation: do not build a folder-attach
workflow, do not use a daily NotebookLM UI bot, and do not choose NotebookLM
Enterprise for Guy's personal Google AI Pro notebook unless Guy separately
approves that product path.

## Automated Now

After the daily canonical Supabase sync, the backend daily runner always creates
the current NotebookLM refresh package:

```powershell
node tools/notebooklm-daily-refresh.mjs --date=<YYYY-MM-DD> --out-dir=summary/kruse-summary/out/notebooklm-refresh/<YYYY-MM-DD>
```

It writes:

- `notebooklm-source-manifest.json`: selected NotebookLM-ready source files and
  source-family counts.
- `drive-source-delta.json`: per-source Drive create/update/no-change plan.
- `freshness-report.json` and `freshness-report.md`: latest canonical dates,
  selected/skipped counts, source-limit checks, and warnings for missing
  families.
- `selected-sources.txt`: the individual files that should become Drive
  sources.
- `drive-source-registry-template.json`: a fill-in manifest for notebook URL and
  Drive file IDs.
- `setup-notebooklm.md`: first-time setup instructions generated for that run.

Production now has a real attached-source notebook:

```text
Notebook: Kruse Knowledge - Drive Sync 114 Sources
URL: https://notebooklm.google.com/notebook/6a5093c8-9b6b-4a9c-82b4-f3c541171db0
Drive folder: Kruse NotebookLM Core Sources - Drive Sync
Drive folder ID: 1RTf8rCpc2_olBPURIOBpPz_5ELzQ754r
Drive folder/registry sources: 114 individual Drive markdown files
NotebookLM attachment: individual Drive files only; newly-created Drive files
must be added once in the notebook UI before their private registry rows can be
marked notebooklmAdded=true.
```

When the backend has real Gemini Notebook rclone mode enabled, it then runs:

```powershell
node tools/notebooklm-rclone-sync.mjs --date=<YYYY-MM-DD> --out-dir=summary/kruse-summary/out/notebooklm-rclone-sync/<YYYY-MM-DD> --registry=/etc/kruse/notebooklm-rclone-sources.json --rclone-config=/etc/kruse/rclone.conf --remote=kruse_notebooklm: --live
```

That updates the same 114 Drive files in place. The sync verifies each file's
Drive ID before upload and verifies the ID did not change after upload. It
writes:

- `notebooklm-rclone-sync-report.json`
- `notebooklm-rclone-sync-report.md`

Required backend env for the production real notebook update:

```text
NOTEBOOKLM_RCLONE_LIVE=true
NOTEBOOKLM_RCLONE_REQUIRE_LIVE=true
NOTEBOOKLM_RCLONE_SOURCE_REGISTRY=/etc/kruse/notebooklm-rclone-sources.json
NOTEBOOKLM_RCLONE_CONFIG=/etc/kruse/rclone.conf
NOTEBOOKLM_RCLONE_REMOTE=kruse_notebooklm:
NOTEBOOKLM_RCLONE_DERIVED_SOURCE_DIR=.codex-tmp/notebooklm-derived-sources
NOTEBOOKLM_REFRESH_MATERIALIZE_AUDIO_TRANSCRIPTS=true
NOTEBOOKLM_REFRESH_INCLUDE_PRIVATE_BLOGS=true
```

The rclone config is private server state. It contains the OAuth refresh token
for Guy's Google Drive account and must stay out of git, logs, PR bodies, and
screenshots.

When the backend has the separate Drive API registry mode enabled, it runs:

```powershell
node tools/notebooklm-drive-publisher.mjs --date=<YYYY-MM-DD> --out-dir=summary/kruse-summary/out/notebooklm-refresh/<YYYY-MM-DD> --source-registry=<registry-path> --profile=pro --live
```

Live mode updates recorded `driveFileId` targets in place and writes:

- `drive-publish-report.json`
- `drive-publish-report.md`
- updated private source registry with `lastUploadedSha256`,
  `lastUploadedAt`, Drive URL, MIME type, and Drive modified time.

Neither live path opens NotebookLM, drives the NotebookLM UI, attaches a Drive
folder, creates a new daily file for an existing source path, writes Supabase,
sends email, spends paid STT, or triggers GitHub Actions.

Required backend env for the separate Drive API source-registry path:

```text
NOTEBOOKLM_DRIVE_LIVE=true
NOTEBOOKLM_DRIVE_REQUIRE_LIVE=true
NOTEBOOKLM_DRIVE_SOURCE_REGISTRY=/etc/kruse/notebooklm-drive-sources.json
NOTEBOOKLM_GOOGLE_DRIVE_SCOPE=https://www.googleapis.com/auth/drive.file
```

Provide one Google Drive credential set:

```text
GOOGLE_DRIVE_CLIENT_ID=<oauth-client-id>
GOOGLE_DRIVE_CLIENT_SECRET=<oauth-client-secret>
GOOGLE_DRIVE_REFRESH_TOKEN=<oauth-refresh-token>
```

or:

```text
NOTEBOOKLM_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<base64-service-account-json>
```

Do not enable both live paths unless the registries intentionally describe the
same NotebookLM source set. Production issue #497 uses rclone because the real
notebook already has stable Drive file IDs and the backend must update those
existing file IDs; issue #514 expanded that Drive registry to 114 files by
adding podcast, PowWow, and a second webinar bundle.

## First-Time Setup

Manual or separately approved setup is required for a new notebook until a real
notebook URL and per-source Drive file IDs are recorded.

1. Create or open the NotebookLM notebook in Guy's account.
2. Open the latest `selected-sources.txt` from
   `summary/kruse-summary/out/notebooklm-refresh/<date>/`.
3. Create one stable Google Drive file for each selected source path. Prefer
   Drive-hosted Markdown/source files for large repo bundles; use Google Docs
   only when the file size/content shape makes that a better manual choice.
4. Add each Drive file individually as a source in NotebookLM.
5. Copy `drive-source-registry-template.json` to
   `/etc/kruse/notebooklm-drive-sources.json` on the backend host or another
   approved persistent registry path.
6. Fill the notebook URL, each `driveFileId`, each `driveUrl`, and set
   `notebooklmAdded=true` after the source is attached.
7. Keep the real registry out of git unless Guy explicitly approves committing
   those personal Drive IDs.

`summary/kruse-summary/notebooklm-drive-sources.example.json` shows the separate
Drive API schema. `summary/kruse-summary/notebooklm-rclone-sources.example.json`
shows the production rclone schema. Real registries are private operational
state and are gitignored.

## Daily Refresh

Once first-time setup exists, each live daily refresh updates the same Drive
file IDs. It does not create a new Drive file every day for an existing source
path. A new Drive file is needed only when a newly selected source path appears.
That new file must then be added individually to NotebookLM and recorded in the
registry.

The delta actions mean:

- `no_change`: the selected source hash matches the recorded upload hash.
- `update_existing_drive_file`: update the recorded `driveFileId` with the
  current source bytes. In backend live mode this is automated.
- `verify_or_update_existing_drive_file`: a `driveFileId` exists, but no
  uploaded hash is recorded yet.
- `add_existing_drive_file_to_notebooklm`: the Drive file exists but is not
  recorded as added to NotebookLM.
- `first_time_create_drive_file_and_add_individual_source`: create the stable
  Drive file only when `NOTEBOOKLM_DRIVE_ALLOW_CREATE=true` and
  `NOTEBOOKLM_DRIVE_ALLOW_PENDING_NOTEBOOKLM=true`; then add it individually to
  NotebookLM and record `notebooklmAdded=true`.

## Live-Action Boundary

Guy approved the issue #497 real update path in chat on 2026-07-22: backend
daily runs may update the existing Gemini Notebook Drive source files when the
backend rclone env and registry are configured. That approval does not include
NotebookLM UI/browser automation as the daily job, Drive folder attachment,
Enterprise API setup, paid STT, email, or GitHub Actions.

Additional live setup still needs a precise approval/status trail when it
touches a new boundary. A sufficient approval sentence for NotebookLM UI/source
attachment work is:

```text
I approve Codex to use my Google Drive/NotebookLM session for issue #487 to add the selected Drive files individually to the named NotebookLM notebook and record the notebook URL plus Drive file IDs. Do not attach a folder.
```

If the only viable automated source-attachment path requires NotebookLM
Enterprise API access, Google Drive mutation, browser automation, or
personal-account UI actions, record that boundary in the issue/PR trail. Do not
imply Drive folder attach is available.

## Production Live Proof

Production proof for issue #497 is not a throwaway notebook. It is:

1. Verify the real notebook lists the 99 expected source names.
2. Verify `/etc/kruse/rclone.conf` can list the Drive folder as service user
   `kruse`.
3. Generate `/etc/kruse/notebooklm-rclone-sources.json` from the real Drive
   folder and expected local source mapping.
4. Run `tools/notebooklm-rclone-sync.mjs --live` from the backend.
5. Confirm the report shows unchanged files skipped and changed files updated
   with the same Drive file IDs.
