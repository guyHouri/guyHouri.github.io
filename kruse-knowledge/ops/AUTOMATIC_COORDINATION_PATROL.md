# Automatic Coordination Patrol

This document is the feature contract for the replacement stale patrol.

The patrol is not a reminder bot. It is an automatic coordinator that keeps
Codex worker, review-fix, monitor, and coordinator chats aligned with GitHub
Project, issues, PRs, branches, worktrees, failed starts, and archive state.

## Why This Exists

The old stale patrol failed because it was too narrow and too passive. It did
not preserve Guy's intent across all work surfaces, and it left Guy supervising
the machinery.

The replacement patrol must solve these pain points:

- Chats were archived before their work was actually finished.
- Finished chats stayed open and cluttered the workspace.
- Failed worktrees and pending starts disappeared without recovery.
- PRs were opened without materialized `review-fix/` ownership.
- Review-fix lanes were missing, malformed, duplicated, or only "requested".
- Coordinators summarized status without checking all relevant work surfaces.
- Guy had to remember which chats mattered and what each one was supposed to do.
- Routine issue comments became noisy.
- `Waiting on Guy` was used when the real next action belonged to a worker,
  coordinator, or review-fix lane.
- Stale chats trapped important context instead of transferring it into durable
  task state.
- Repeated patrol output annoyed Guy instead of reducing his load.

## Product Behavior

The patrol runs automatically. Guy does not choose a mode.

Recommended cadence:

- Run every 30 minutes.
- Also run on demand when Guy asks for queue/status/stuck-work cleanup.

Thirty minutes is the default because failed worktree starts and missing
review-fix lanes should not wait an hour, while shorter intervals create churn
without meaningful new evidence.

Every run follows the same loop:

```text
inventory work
  -> reconcile evidence
  -> perform safe coordination actions
  -> archive proven-finished chats
  -> report only exceptions or material changes
```

## Quiet Status Model

Routine status must not spam GitHub issue comments.

Routine state belongs in Project fields and the patrol ledger:

- current state,
- worker thread,
- review-fix thread,
- branch and worktree,
- last checked time,
- next owner,
- finding hash,
- stale or blocked marker,
- archive candidate marker,
- recovered or superseded start marker.

Issue and PR comments are reserved for material transitions:

- worker started or replaced,
- PR opened,
- review-fix lane created, recovered, or failed,
- failed worktree recovered,
- task blocked with a real blocker,
- chat archived,
- exact Guy decision needed,
- abort or error that needs an audit trail.

Do not write routine "still working" issue comments.

## Evidence Inventory

The patrol builds one work graph from:

- GitHub Project items,
- open issues and issue metadata,
- open PRs and PR comments,
- worker chats,
- review-fix chats,
- monitor/coordinator chats,
- branches,
- worktrees,
- pending worktree starts,
- failed worktree starts,
- previous patrol ledger state,
- archive candidates.

Chats are execution surfaces, not the only source of truth. The patrol may use
chat content as evidence, but it must not wait on a stale chat to self-report
before taking safe coordination action.

## Safe Actions

When evidence is clear, the patrol should act automatically.

It may:

- update Project fields,
- update the quiet patrol ledger,
- nudge stale workers once,
- recover missing review-fix lanes and require verified materialization,
- repair malformed review-fix titles,
- recover failed worktree starts,
- release or replace dead leases,
- keep unfinished chats open with a recorded next owner,
- archive chats proven finished,
- add issue or PR comments only for material transitions.

It must stop for explicit approval before:

- paid spend,
- live Supabase writes,
- sending email,
- changing secrets or variables,
- destructive cleanup,
- broad live scraping,
- production resource deletion or rename,
- ambiguous product or scope decisions.

## Failed Worktree Recovery

Failed starts are first-class patrol work.

The patrol must detect:

- pending worktree ids that never materialized,
- pending review-fix lanes that never became real threads,
- chats or rows titled exactly `worktree init failed`,
- starts whose stored title begins with `worktree init failed`.

When a failed start is found, the patrol should:

1. Reconstruct the intended task from the parent/coordinator chat, issue, PR,
   branch, lane name, pending id, and available app state.
2. Search for an already-materialized replacement by branch, issue number, PR
   number, lane title, and pending id.
3. If no replacement exists and the scope is still valid, create or recover a
   replacement worker/review-fix lane and verify the materialized thread id.
4. Update Project fields and the relevant PR/issue only when the state
   materially changes.
5. Mark the failed start obsolete only after a replacement exists or the work
   is explicitly parked/superseded.

Do not classify a meta/support chat that merely mentions `worktree init failed`
as a failed worker-start source. The stored title must exactly match or clearly
start with `worktree init failed`.

## Review-Fix Ownership

Every open PR must have one real quality owner:

- a materialized `review-fix/pr-<number>-<short-scope>` lane,
- a human reviewer pass,
- an explicit quality pass,
- or an exact reviewer blocker with next owner.

Opening the PR and materializing the combined review-fix Codex thread are one
implementation-worker handoff step. The worker that opens the PR must create
the `review-fix/pr-<number>-<short-scope>` chat, verify that `list_threads`
shows a real thread id with the exact stored title, repair a wrong stored title
with `set_thread_title`, and update PR/Project state with that verified thread
evidence before claiming the handoff complete.

The patrol should not classify missing review ownership as `Waiting on Guy`
unless a real human decision is needed. Missing review-fix ownership is a
coordinator/worker action.

For a pending review-fix lane:

- a PR comment saying "requested" is not enough,
- a PR comment or Project field saying "review requested" is not enough,
- a PR body saying "reviewer assigned" or "review requested" is not enough,
- a pending worktree id is not enough,
- a preview/body that contains the right lane is not enough.

The stored thread title itself must start with
`review-fix/pr-<number>-<short-scope>`.

`pendingWorktreeId` is only a temporary creation state. If the pending start
does not materialize, the worker or patrol must recover/recreate the review-fix
lane or record an exact hard blocker with next owner. The worker must not stop
at "review requested", "reviewer needed", a PR comment, a Project field, or a
pending id.

## Archive Rules

The patrol archives chats itself when the proof is strong enough.

A chat is archive-safe only when:

- the work is done or explicitly superseded,
- the PR is merged/closed or no PR was needed,
- issue and Project state are consistent,
- no hidden follow-up remains in the chat,
- no blocker remains,
- `ARCHIVE_OK: yes` exists or the patrol can prove equivalent closeout,
- broad/support/planning context has no unresolved Guy mission left.

If uncertain, leave the chat open and record the exact next action or owner.

Never archive a chat just because it is quiet. Never leave a completed chat open
just because nobody checked it.

## Notification Rules

Guy supervises by exception.

Notify Guy only for:

- decisions only Guy can make,
- approval boundaries,
- serious process failures,
- material cleanup completed,
- external-impact blockers,
- ambiguous product/scope choices.

Do not notify Guy for:

- routine stale findings with a worker/coordinator owner,
- repeated unchanged findings,
- missing review-fix lanes that the patrol can recover without Guy,
- failed starts that the patrol can recover,
- archive cleanup that is already safe and complete.

## Patrol Output

Patrol reports should be short and grouped by action:

```text
Done automatically:
- Archived 4 completed chats.
- Recovered 1 failed review-fix worktree.
- Created/requested 2 review-fix lanes.
- Updated 5 Project rows.

Still active:
- PR #285: review-fix lane running.
- Issue #225: worker still processing.

Needs Guy:
- Issue #191: approve live Supabase proof or keep parked.
```

If nothing needs Guy, say `None right now`.

## Implementation Contract

The repo implementation should provide:

- a deterministic classifier with fixture tests,
- a quiet ledger/state format for dedupe,
- a GitHub evidence collector,
- a thread/worktree-start evidence input format for Codex automation,
- action intents for Project updates, review-fix creation, worktree recovery,
  title repair, chat archive, and Guy notification,
- dry-run output for review,
- guarded automatic execution for safe coordination actions.

The Codex automation runner is responsible for app-native thread operations
such as creating review-fix lanes, renaming thread titles, and archiving chats.
The repo tool must make those operations deterministic by emitting exact action
intents with evidence and safety classification.

## Errors This Feature Must Avoid

- Do not implement or run unapproved scope.
- Do not expose Guy to user-facing patrol modes.
- Do not rely on stale chats to self-report as the only truth.
- Do not force every worker to post routine GitHub issue comments.
- Do not archive quiet chats just because they look inactive.
- Do not leave finished chats open because nobody checked.
- Do not classify missing review-fix ownership as `Waiting on Guy`.
- Do not let a worker call a PR handoff complete until the review-fix chat is
  materialized with a real thread id and exact stored title.
- Do not treat `review requested`, `reviewer assigned`, PR/Project comments, or
  `pendingWorktreeId` as healthy review-fix ownership.
- Do not mark failed worktrees handled until a real replacement exists or the
  work is explicitly parked/superseded.
- Do not emit repeated noisy findings when nothing changed.
- Do not perform external-impact actions without explicit approval.
