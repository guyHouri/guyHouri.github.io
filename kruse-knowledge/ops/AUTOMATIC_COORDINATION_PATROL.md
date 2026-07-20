# Automatic Queue/Audit Patrol

This document is the feature contract for the exception patrol. The historical
file name stays for existing links, but the operating model is queue/audit, not
a standing coordinator.

The patrol is not a reminder bot and not a default task owner. Routine task
work belongs to the task worker: implementation, self-review, safe fixes, PR,
merge when eligible, cleanup, issue/Project closeout, and archive. The patrol
only reconciles evidence, recovers stale or failed work, and reports exceptions.

## Why This Exists

The old stale patrol failed because it was too narrow and too passive. It did
not preserve Guy's intent across all work surfaces, and it left Guy supervising
the machinery.

The replacement patrol must solve these pain points:

- Chats were archived before their work was actually finished.
- Finished chats stayed open and cluttered the workspace.
- Failed worktrees and pending starts disappeared without recovery.
- PRs were opened and then left at "review requested" or "please send this to
  review/merge" without worker self-review, merge, cleanup, or archive.
- Status summaries missed relevant issues, PRs, branches, worktrees, and chats.
- Guy had to remember which chats mattered and what each one was supposed to do.
- Routine issue comments became noisy.
- `Waiting on Guy` was used when the real next action belonged to a worker or
  audit lane.
- Stale chats trapped important context instead of transferring it into durable
  task state.
- Repeated patrol output annoyed Guy instead of reducing his load.

## Product Behavior

The patrol runs automatically. Guy does not choose a mode.

Recommended cadence:

- Run every 30 minutes.
- Also run on demand when Guy asks for queue/status/stuck-work cleanup.

Thirty minutes is the default because failed worktree starts and stalled worker
closeouts should not wait an hour, while shorter intervals create churn without
meaningful new evidence.

Every run follows the same loop:

```text
inventory work
  -> reconcile evidence
  -> perform safe queue/audit actions
  -> archive proven-finished chats
  -> report only exceptions or material changes
```

## Action Gate

Every patrol run must reduce the work surface or transfer each item to an exact
owner. A run is incomplete if it only repeats the same blockers.

Each finding must end in one of these states:

- `Done automatically`: the patrol archived, closed, parked, pruned, recovered,
  title-repaired, or updated durable Project/issue/PR state.
- `Active owner`: a named worker, optional reviewer, monitor, audit lane, PR, or
  issue owns the next action, with a real thread id or access route when one is
  available.
- `Waiting on Guy`: only a decision, secret, live-action approval, or scope
  choice Guy alone can provide. It must name the exact decision, the short
  phrase/action Guy can say or do, the safe default if he does not answer, and
  the next owner/action after approval.
- `Hard blocker`: an external tool/auth/live-boundary failure with the next
  owner named.

Do not leave `ARCHIVE_OK: no` as a passive label in patrol output. Any archive-no
item must say `Guy action: None` or the exact sentence/action Guy must provide,
what the patrol already handled, the concrete next owner/action, and why the
patrol could not safely complete that action first. Routine safe cleanup, title
repair, board sync, worker nudges, self-review/merge recovery, and archive
closeout should be done before reporting.

Do not notify Guy with vague blockers such as `approve cleanup`, `decide PRs`,
or `review everything`. A patrol finding that lacks `Decision needed`,
`Guy should say/do`, `Safe default if no answer`, and
`Next owner after approval` must be rewritten or flagged before notification.
If the next step is routine and already approved, the owning worker acts; if the
worker is stale, the patrol recovers or replaces it instead of classifying it as
`Waiting on Guy`.

If the only cleanup blocker is the active chat holding its own path or worktree
open, transfer the post-archive cleanup to the issue, Project row, or an
explicit audit lane and let the active chat archive when no other mission
remains. The patrol should not preserve a deadlock where the chat stays open
because it is open.

If the same unchanged finding appears on two consecutive patrols, the patrol
must take an allowed action, park the item with a specific owner, open or update
the durable process bug, or pause the heartbeat and report why it cannot reduce
the surface. Do not keep a heartbeat alive just to say "no material change."

## Quiet Status Model

Routine status must not spam GitHub issue comments.

Routine state belongs in Project fields and the patrol ledger:

- current state,
- worker thread,
- optional reviewer or audit thread,
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
- worker self-review/merge/cleanup blocker recorded,
- optional reviewer or audit lane created, recovered, or failed,
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
- optional reviewer, monitor, and audit chats,
- branches,
- worktrees,
- pending worktree starts,
- failed worktree starts,
- previous patrol ledger state,
- archive candidates.

Chats are execution surfaces, not the only source of truth. The patrol may use
chat content as evidence, but it must not wait on a stale chat to self-report
before taking safe queue/audit action.

## Safe Actions

When evidence is clear, the patrol should act automatically.

It may:

- update Project fields,
- update the quiet patrol ledger,
- nudge stale workers once,
- recover incomplete worker self-review/merge/cleanup closeout,
- repair malformed task, review, monitor, or audit titles,
- recover failed worktree starts,
- release or replace dead leases,
- keep unfinished chats open with a recorded next owner,
- archive chats proven finished,
- close or park stale draft PRs when the linked issue/PR says they are
  superseded, explicitly out of scope, or approved for closure,
- remove clean completed task worktrees under an approved cleanup issue when
  they are merged, exact `origin/main` ancestors, or tied to closed/superseded
  work with no dirty state, open PR, active owner, or private submodule risk,
- run `git worktree prune` after safe worktree removal,
- add issue or PR comments only for material transitions.

It must stop for explicit approval before:

- paid spend,
- live Supabase writes,
- sending email,
- changing secrets or variables,
- destructive cleanup outside a named approved cleanup policy,
- broad live scraping,
- production resource deletion or rename,
- ambiguous product or scope decisions.

## Failed Worktree Recovery

Failed starts are first-class patrol work.

The patrol must detect:

- pending worktree ids that never materialized,
- pending optional review/audit lanes that never became real threads,
- chats or rows titled exactly `worktree init failed`,
- starts whose stored title begins with `worktree init failed`.

When a failed start is found, the patrol should:

1. Reconstruct the intended task from the parent/source/audit chat, issue, PR,
   branch, lane name, pending id, and available app state.
2. Search for an already-materialized replacement by branch, issue number, PR
   number, lane title, and pending id.
3. If no replacement exists and the scope is still valid, create or recover a
   replacement worker or optional review/audit lane and verify the materialized
   thread id.
4. Update Project fields and the relevant PR/issue only when the state
   materially changes.
5. Mark the failed start obsolete only after a replacement exists or the work is
   explicitly parked/superseded.

Do not classify a meta/support chat that merely mentions `worktree init failed`
as a failed worker-start source. The stored title must exactly match or clearly
start with `worktree init failed`.

## PR Lifecycle Ownership

Every open PR must have one active owner.

By default, that owner is the branch's task worker. A healthy PR has evidence
that the worker:

- self-reviewed the diff against the approved issue card,
- fixed safe findings directly on the branch or recorded no findings,
- ran focused local checks and named any test gap,
- classified any remaining failure as PR-related, already present on
  `origin/main`, or unproven,
- marked ready/merged when eligible or recorded the exact hold/blocker,
- handled branch/worktree cleanup and archive closeout after merge.

Optional separate review is allowed only when Guy asks for it, the issue card
requires it, the change is high risk, or the worker records an exact blocker it
cannot safely resolve. Optional reviewer chats should use `review/<short-scope>`
and have a clear pass/fail scope. They do not become the default owner for
routine merge or archive unless issue/Project status explicitly transfers
ownership.

The patrol should not classify missing review/merge ownership as
`Waiting on Guy` unless a real human decision is needed. A worker that stopped
at "review requested", "reviewer needed", "please send this to review/merge",
a PR/Project comment, or `pendingWorktreeId` still owns the next action.

`pendingWorktreeId` is only a temporary creation state. If a pending worker or
optional review/audit start does not materialize, the worker or patrol must
recover/recreate the start or record an exact hard blocker with next owner.

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

- routine stale findings with a worker or audit owner,
- repeated unchanged findings,
- self-review/merge/cleanup closeout that the owning worker can finish,
- failed starts that the patrol can recover,
- archive cleanup that is already safe and complete.

## Patrol Output

Patrol reports should be short and grouped by action:

```text
Done automatically:
- Archived 4 completed chats.
- Recovered 1 failed worker worktree.
- Nudged 2 workers to finish self-review/merge closeout.
- Updated 5 Project rows.

Still active:
- PR #285: owning worker is rerunning local checks.
- Issue #225: worker still processing.

Needs Guy:
- Issue #191: Decision needed: approve read-only live Supabase status proof.
  Guy should say/do: "approve read-only Supabase status check".
  Safe default if no answer: keep #191 parked.
  Next owner after approval: RAG proof worker runs the read-only status check.
```

If nothing needs Guy, say `None right now`.

## Dry-Run Examples

Dry-run output should show the action gate decision and the safety evidence
before any automatic cleanup runs:

```text
Done automatically:
- Archive-safe chat `codex/issue-123-finished`: PR merged, issue Done,
  `ARCHIVE_OK: yes`, no unresolved missions found.
- Stale draft PR #456 parked: linked issue says superseded by #789 and the PR
  has no active owner.
- Pruned worktree `.codex-worktrees/issue-222-old-task`: clean, merged, exact
  `origin/main` ancestor, no open PR, no private submodule state.

Hard blocker:
- Did not prune `.codex-worktrees/issue-333-unclear`: dirty files and no
  explicit discard decision. Guy action: None. Already handled: archived the
  diff and checked PR/issue ownership. Next owner/action: audit lane creates a
  recover-or-discard card with the exact dirty paths.

Transferred post-archive cleanup:
- Chat `codex/issue-999-example` is safe to archive; only remaining action is
  deleting the empty active-thread directory after release. Guy action: None.
  Next owner/action: audit lane deletes `<path>` after the chat is archived.
```

## Implementation Contract

The repo implementation should provide:

- a deterministic classifier with fixture tests,
- a quiet ledger/state format for dedupe,
- a GitHub evidence collector,
- a thread/worktree-start evidence input format for Codex automation,
- action intents for Project updates, worker recovery, optional review/audit
  creation, worktree recovery, title repair, chat archive, and Guy
  notification,
- dry-run output for review,
- guarded automatic execution for safe queue/audit actions.

The Codex automation runner is responsible for app-native thread operations
such as creating worker or optional review/audit lanes, renaming thread titles,
and archiving chats. The repo tool must make those operations deterministic by
emitting exact action intents with evidence and safety classification.

## Errors This Feature Must Avoid

- Do not implement or run unapproved scope.
- Do not expose Guy to user-facing patrol modes.
- Do not rely on stale chats to self-report as the only truth.
- Do not force every worker to post routine GitHub issue comments.
- Do not archive quiet chats just because they look inactive.
- Do not leave finished chats open because nobody checked.
- Do not classify missing self-review/merge/cleanup ownership as
  `Waiting on Guy`.
- Do not let a worker call a PR complete until self-review, focused evidence,
  merge/hold status, cleanup, and archive closeout are recorded.
- Do not treat `review requested`, `reviewer assigned`, PR/Project comments, or
  `pendingWorktreeId` as healthy worker closeout.
- Do not mark failed worktrees handled until a real replacement exists or the
  work is explicitly parked/superseded.
- Do not emit repeated noisy findings when nothing changed.
- Do not perform external-impact actions without explicit approval.
