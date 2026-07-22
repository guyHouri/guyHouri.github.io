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

After the daily canonical Supabase sync, the daily workflow runs a dry-run
export:

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

The dry-run does not open NotebookLM, upload to Drive, mutate Google Drive,
write Supabase, send email, spend API money, mutate secrets/env, or trigger
GitHub Actions.

## First-Time Setup

Manual setup is required until a real notebook URL and per-source Drive file IDs
are recorded.

1. Create or open the NotebookLM notebook in Guy's account.
2. Open the latest `selected-sources.txt` from
   `summary/kruse-summary/out/notebooklm-refresh/<date>/`.
3. Create one stable Google Drive file for each selected source path. Prefer
   Drive-hosted Markdown/source files for large repo bundles; use Google Docs
   only when the file size/content shape makes that a better manual choice.
4. Add each Drive file individually as a source in NotebookLM.
5. Copy `drive-source-registry-template.json` to
   `summary/kruse-summary/notebooklm-drive-sources.json` or another approved
   registry path.
6. Fill the notebook URL, each `driveFileId`, each `driveUrl`, and set
   `notebooklmAdded=true` after the source is attached.
7. Keep the real registry out of git unless Guy explicitly approves committing
   those personal Drive IDs.

`summary/kruse-summary/notebooklm-drive-sources.example.json` shows the tracked
schema. The default real registry path is gitignored.

## Daily Refresh

Once first-time setup exists, each daily refresh should update the same Drive
file IDs. It should not create a new Drive file every day for an existing source
path. A new Drive file is needed only when a newly selected source path appears.
That new file must then be added individually to NotebookLM and recorded in the
registry.

The delta actions mean:

- `no_change`: the selected source hash matches the recorded upload hash.
- `update_existing_drive_file`: update the recorded `driveFileId` with the
  current source bytes after manual action or explicit Drive mutation approval.
- `verify_or_update_existing_drive_file`: a `driveFileId` exists, but no
  uploaded hash is recorded yet.
- `add_existing_drive_file_to_notebooklm`: the Drive file exists but is not
  recorded as added to NotebookLM.
- `first_time_create_drive_file_and_add_individual_source`: create the stable
  Drive file, add it individually to NotebookLM, and record its ID.

## Live-Action Boundary

Codex must stop before live NotebookLM or Google Drive actions unless Guy gives
explicit approval for that exact action. A sufficient approval sentence is:

```text
I approve Codex to use my Google Drive/NotebookLM session for issue #434 to create or update the selected Drive files, add them individually to the named NotebookLM notebook, and record the notebook URL plus Drive file IDs. Do not attach a folder.
```

If the only viable automated source-attachment path requires NotebookLM
Enterprise API access, Google Drive mutation, browser automation, or
personal-account UI actions, record that boundary in the issue/PR trail and keep
the daily workflow as dry-run/export only.

## First Live Proof

Before trusting large daily bundle updates, run one separately approved live
proof:

1. Create one tiny Drive-hosted `.md` file.
2. Add that file individually to a throwaway NotebookLM notebook.
3. Update the same Drive file ID with changed text.
4. Wait the documented sync window, then verify NotebookLM sees the changed text
   or that the manual Google Drive sync control works.
5. Record the result in the issue/Project trail before enabling any live Drive
   publisher.
