# AI Workflow

This document defines how Guy and AI assistants plan, execute, review, and
close work in `guyHouri/kruse-knowledge`.

This is the canonical detailed workflow. `AGENTS.md` and the root
`AI_WORKFLOW.md` are entry points and summaries. If workflow or process
instructions conflict, this file wins; update this file first, then keep the
summaries in sync.

## Core Rules

- The GitHub repo/project `guyHouri/kruse-knowledge` is the task source of truth.
- Every task should have a GitHub issue, even small tasks, because undocumented work creates drift.
- Codex-created issue bodies must use the #273-style Markdown card generated
  or validated by `tools/create-issue-card.ps1` / `tools/issue-card.mjs`.
  Form-created issues must be edited into that format before worker
  delegation.
- The GitHub issue number is the task ID. Worker prompts and implementation branches must include it.
- GitHub Issues are also the TFS-like work items: missions, stories, tasks, bugs, research, docs, and cleanup are all issues with type labels.
- A chat is an execution surface, not the system of record.
- When an agent picks up an issue, its first visible action is to claim it on
  the GitHub Project board: add the issue to the Project if missing, move
  `Status` to `Active`, set `Owner` and `Worker Thread`, and record the branch
  in the issue or status trail before implementation edits.
- `origin/main` is law. Local worktrees, worker chats, and experiments are
  disposable until reviewed through a PR and merged.
- The shared root checkout is for sync, inspection, and quarantine only. It is
  not a task workspace and must not accumulate task edits, deliverables,
  generated files, or PR bodies.
- Task work must not happen directly on `main` or in the shared root checkout.
  Use one branch and one worktree per task, based on current `origin/main`.
- A saved file is not done until it is either committed/pushed to a reviewable
  branch or called out in handoff with a real access route.
- Plain "yes", "ok", "go", "approved", or equivalent from Guy is approval for the current proposed scope. Do not require formal approval phrases.
- Mission approval approves direction and task planning. Task approval approves named task issues or a named batch for execution.
- Routine repo work does not need conversational permission. External-impact work still needs explicit approval at the point where it affects real money, production data, real users, secrets, or destructive external state.
- If public-site or GitHub Pages code/config changed, deployment after merge is expected once checks pass and no hold remains.
- Workers must add or update tests for code they add, including unit tests and integration/smoke tests where the repo has a reasonable test surface.
- Worker test evidence must prove the changed behavior, not only show that broad or unrelated checks are green.
- Workers own their own test-gap review. A missing-test exception must be
  explicit in the PR or issue closeout and justified by concrete risk, not
  hidden behind a broad green check.
- A task worker or mission-owning agent owns the whole task lifecycle by
  default: implementation, self-review, safe fixes, draft PR, local evidence,
  marking ready/merge when eligible, branch cleanup, task worktree removal,
  `git worktree prune`, issue/Project closeout, and final chat archive
  decision. Do not create a separate coordinator or `review-fix/` lane for
  routine task work. The worker must not stop at "review requested",
  "reviewer needed", "please send this to review/merge", a PR/Project comment,
  or `pendingWorktreeId`; if it cannot review, fix, merge, or archive safely,
  it records the exact blocker and next owner before ending the turn.
- GitHub Actions PR pipeline pause, effective June 14, 2026: while Actions minutes are exhausted, PRs must not trigger, rerun, dispatch, wait for, or require GitHub Actions unless Guy explicitly lifts the pause. Use local evidence instead: PR body preflight, local PR guard, focused tests, and `npm run prod-check` for production site/email/workflow changes.
- Status must be concrete: who owns the next action, what is blocked, and what exact decision is needed.

## How A Chat Knows How To Behave

A repo-scoped chat should read:

1. `AGENTS.md`
2. This file
3. The linked GitHub issue or mission doc
4. The linked PR, branch, or worker prompt when present

Project-specific AI workflow skills belong in tracked repo files under
`.agents/skills/`. Local `~/.codex/skills` copies are personal/runtime
convenience only; if a rule must shape future repo work, land it in the repo
instead of leaving it only in a local skill.

Projectless chats do not automatically know repo rules unless they are opened under a parent folder with its own `AGENTS.md` or are explicitly pointed at this repo. Existing chats may also have stale context. When continuing an old chat, send it a short current-rules update instead of assuming it has reloaded instructions.

## Chat Roles

Roles describe the job a chat is doing. They do not create a required handoff
chain. For approved task work, the worker chat owns the task end to end unless
the approved card or a concrete blocker says otherwise.

Allowed roles:

- Planner: turns vague goals into missions, issues, tasks, and worker prompts.
- Queue/Audit: checks status across issues, PRs, branches, workflows, and
  worker chats only for broad queue reports, stale recovery, and exception
  handling.
- Worker: implements one issue on one branch/worktree.
- Reviewer: optional separate review for high-risk work, explicit user request,
  or a worker-declared blocker. It is not the default PR path.
- Research/Support: answers a bounded question, investigates context, or captures user context without owning implementation.
- External Operator: performs external-impact actions after explicit approval.

A chat can switch roles only when it says so clearly and updates the relevant
issue/status. A worker is its own first reviewer and merge owner: it must read
its diff skeptically, verify tests and risk, fix safe findings, and merge only
when the approved scope, evidence, and merge boundary are clear. The planner may
create issues, docs, task cards, project fields, and worker prompts. The planner
should not silently merge PRs or perform external-impact operations unless it is
also the named task worker for an approved issue.

## Chat Titles And Delegation

Every Kruse repo-scoped chat should have a useful stored title, including chats
Guy opens directly. Once the repo, role, and scope are clear, rename the current
thread or newly created thread to a role/scope title instead of leaving the
app-generated user sentence. Good shapes include `plan/<short-scope>`,
`research/<short-scope>`, `support/<short-scope>`, `monitor/<short-scope>`,
`audit/<short-scope>`, and branch-style implementation titles such as
`feat/<short-scope>`, `fix/<short-scope>`, or `docs/<short-scope>`.

If a direct user-opened chat later becomes implementation work, create the
normal issue/branch/worktree/worker lane and keep the source chat titled as its
actual role, such as `plan/<short-scope>`, `support/<short-scope>`, or
`audit/<short-scope>`. Do not
rename broad personal or projectless chats just because they exist; this rule
applies when the chat is repo-scoped or is being used to coordinate
`kruse-knowledge` work.

Planner, queue, and audit chats must keep delegation concise and mechanically
safe. A delegation prompt is assignment context, not implementation approval by
itself. It must carry the approved task scope, not replace it.

Every delegated worker thread title must exactly match the branch or lane it
owns. When the current Codex thread tool exposes a `title` argument, pass that
clean value as the tool title. When the tool does not expose a title argument,
put the clean value in a `Branch:` or `Lane:` line near the top of the prompt
and treat the post-create verify/repair step below as mandatory.

The delegation message body must not contain a line beginning `Chat title:`.
Use `Branch:` for implementation workers or `Lane:` for optional review,
monitor, or audit lanes. This keeps Codex from auto-titling the thread with the literal
`Chat title:` prefix.

After `create_thread` returns a thread id, Control Chat must verify the stored
title by listing or reading the thread. If the stored title does not exactly
match the branch or lane, call `set_thread_title` before presenting the worker
as active. For the current chat, rename the stored title as soon as the role and
scope are clear enough to choose a stable title.

Title verification means checking the thread's stored `title` field, not the
preview or first line of the delegation body. A worker launch is not complete
until the stored title itself matches the intended branch or lane.

Thread creation and title repair can race app indexing. If `create_thread`
returns a thread id but `list_threads`, `read_thread`, or `set_thread_title`
cannot find it yet, wait briefly and retry discovery/rename until the stored
title reads back correctly, or record the exact blocker. Do not report a
worker, reviewer, or audit lane as properly launched while the only evidence is
the returned id, prompt preview, pending worktree id, or an attempted rename
that has not been read back.

When `create_thread` returns only a pending worktree id, Control Chat must later
list or read the materialized thread and rename it before presenting the lane as
active. If the app refuses a rename because a thread is unloaded or
unregistered, report that exact blocker and do not mark title cleanup complete.

If an active legacy repo-scoped title starts with the literal `Chat title:`
prefix, is a sentence-style title such as `Review PR 123 ...`, `Fix stale
task`, or a raw user request, or is the raw `<codex_delegation>...`
payload while the body/preview contains a clean role, branch, or lane, rename it
to the clean stored title on the next queue/audit touch. If it cannot be
renamed, report the exact blocker.

After creating or coordinating workers for a mission, any remaining planning or
queue chat should use `plan/<short-scope>` or `audit/<short-scope>` so the
sidebar shows it is not the task owner. This does not apply to the permanent
Master/Control chat, which keeps its standing title.

Optional reviewer and monitor lanes must be explicitly labeled `review/` or
`monitor/`. They do not own implementation, safe fixes, merge, or archive unless
the issue/Project status explicitly transfers the task to them.

Worker delegation must include the approved task card, worktree, fresh
`origin/main` base requirement, expected tests, risks, done criteria,
future-protection expectation, PR/status reporting requirements, and final
`ARCHIVE_OK: yes/no` closeout rule, including task worktree cleanup and
`git worktree prune` expectations.

One delegated worker owns one branch/worktree and one path scope unless there
is an explicit handoff.

## Artifact And Checkout Hygiene

Main is the source of truth, not a scratchpad. Agents must keep the shared root
checkout clean enough that Guy can trust it as a sync and inspection point.

- Do not create, edit, or save task files in the shared root checkout unless
  the explicit task is root-checkout cleanup. Use the task worktree.
- Do not leave final deliverables only in hidden or local-only paths such as
  `.codex-worktrees/`, temp folders, Downloads, or ad hoc root folders.
- PR bodies, task notes, screenshots, generated reports, dry-run outputs,
  patches, and analysis artifacts belong in one of three places: committed to
  the task branch when they are part of the reviewable result, attached or
  linked through GitHub/public output when appropriate, or deleted before
  handoff when they are disposable scratch.
- If an artifact cannot be committed or published yet, the handoff must say so
  with the `File reference`, `Availability`, and `Open it here` block from
  this workflow. `worker worktree only` is allowed only as a temporary state
  with the absolute worktree path and owning thread or worktree id.
- Before final handoff, audit both places when accessible:
  `git status --short --branch` in the task worktree, and
  `node tools/root-hygiene-guard.mjs` in the shared root checkout. Any
  task-created dirty file in root must be moved into the task worktree,
  committed/pushed, quarantined outside the checkout, or deleted if disposable.
- When an issue, PR, worker chat, optional review/audit lane, or one-off repo-scoped task
  finishes, remove the completed task worktree with `git worktree remove
  <path>` and then run `git worktree prune` from the repo root, after the branch
  is committed/pushed or merged and no handoff still needs that local checkout.
- Do not force-remove active, dirty, unpushed, blocked, parked, or transferred
  worktrees. If cleanup is unsafe, final status must say `worktree cleanup
  blocked: <reason>` and name the next owner.
- If the shared root checkout already has unrelated dirty files, do not touch
  them. Report them as unrelated quarantine state only when they affect the
  task or artifact findability.
- A handoff is incomplete when it says "saved locally" without a committed PR
  branch, published URL, or exact worktree-only access route.

## Canonical Transcript Closeout

Transcript/STT/import workers must not mark a protected transcript task
archive-ready after proving only local files, or only transcript Storage, when
the canonical target also includes a registry table.

For any task that creates or promotes transcript markdown under
`kruse-archive/podcasts/`, `kruse-archive/powwow/`,
`kruse-archive/qna/`, or `kruse-archive/webinars/`, the closeout evidence must
answer all of these before `ARCHIVE_OK: yes`:

- Selected source count and IDs match the approved task scope.
- Transcript markdown is non-empty and includes provider/model metadata.
- Canonical Storage status is explicit: uploaded/read-back verified in
  `kruse-archive`, or blocked because live Storage upload was not approved.
- Canonical registry status is explicit: `media_items` or the approved
  source-family table was upserted/read-back verified, or blocked because live
  DB write was not approved.
- Raw audio upload remains `false` unless a separate task explicitly approved
  raw-audio Storage upload.
- Drive, NotebookLM, email, GitHub Actions, secrets, and local env/config
  mutations are either verified false or separately approved in the task.

When an evidence manifest exists, run:

```powershell
node tools/check-canonical-transcript-closeout.mjs --manifest <evidence.json> --expect-count <n>
```

If the guard fails because Storage or registry writes were outside approval,
the final response must be `ARCHIVE_OK: no` and name the missing approval or
next owner. Do not call local ignored transcript artifacts "canonical" unless
the issue explicitly scoped a local-only or dry-run deliverable.


## Final Response Closeout

Before sending the final response for any Kruse repo-scoped worker, optional
review/audit lane, support/research answer, queue patrol, or one-off
process-correction turn, run a closeout self-check when the turn used the
task/workflow rules or mutated GitHub issue/PR/Project state, Codex thread
state, branch/worktree state, or task-queue records.

If every mission in the chat is done, explicitly superseded, or transferred to
a tracked owner with no unique context left in the chat, end with:

```text
ARCHIVE_OK: yes
```

If any work remains, end with:

```text
ARCHIVE_OK: no - <specific reason>; next owner: <worker|reviewer|audit|Guy|external blocker>
```

`ARCHIVE_OK: no` must never be a naked blocker. The same final response must
include enough resolution detail that Guy does not have to ask "what should we
do then?":

- `Guy action`: `None` when no human action is needed, or the exact sentence,
  decision, secret, approval, or manual step Guy must provide.
- `Already handled`: what the agent tried, fixed, archived, transferred,
  linked, or ruled out before stopping.
- `Next owner/action`: the named owner plus the concrete next action, command,
  check, thread, issue, PR, path, or access route.
- `Why not handled now`: only when the current agent cannot safely complete or
  transfer the next action itself.

If the next owner would be the same worker, reviewer, audit lane, or another
routine repo agent and the next step is safe, approved, and inside scope, do it
before final. Do not make Guy infer that a routine cleanup, nudge, title repair,
board sync, stale recovery, merge, or archive should happen next.

If the only remaining blocker is caused by the active thread holding its own
worktree, path, terminal, or app-managed checkout open, transfer the post-archive
cleanup action to the issue, Project row, or explicit audit lane, then mark
the current chat safe to archive when no other mission remains. Do not keep the
chat open solely because archiving/releasing it is what makes cleanup possible.

Do not omit `ARCHIVE_OK` because the response feels conversational, because
the only change was issue/board/thread metadata, or because the answer is a
process correction. A missing final `ARCHIVE_OK` on a Kruse repo-scoped
closeout is itself a process bug; correct it immediately and, when needed,
create or update a durable workflow fix instead of leaving the correction only
in chat.

If the turn created, used, or closed a task worktree, the closeout self-check
must also report whether the worktree was removed and `git worktree prune` ran.
`ARCHIVE_OK: yes` means either cleanup succeeded, no task worktree existed, or
the remaining worktree was explicitly transferred to a tracked active owner.

## Task Cards And Queue Reports

Approval-ready task cards must use this exact field order:

```text
Task:
Branch:
Goal:
Approach:
Tests:
Risk:
Done when:
Future protection:
```

One card is one approvable unit of work. Split unrelated concerns into separate
cards. Keep each field concise. Use `Branch: None` only for dashboard, secret,
manual, or no-code tasks.

Do not add `Non-goals` sections to routine task cards or taskboard issue
bodies. If a real live boundary matters, record it under `Risk` in the
approval-ready card and under `External-impact boundaries` in the issue body.
Mission issues may describe scope boundaries when needed, but routine tasks
should stay in the short card shape Guy approves.

When an approved card is turned into a GitHub issue, use the #273-style issue
body:

```text
# <issue title>

Type: <Task|Research|Bug|Docs|Cleanup|...>
Priority: <P0|P1|P2|P3>
Parent: #<issue-number> or standalone
Related: #<issue-number> (optional)

## Task
## Branch
## Goal
## Approach
## Tests
## Risk
## Done when
## Future protection
```

Use structured input plus the helper instead of hand-building multiline GitHub
commands:

```powershell
tools/create-issue-card.ps1 -Mode IssueCreate -SpecFile <issue-card.json>
tools/create-issue-card.ps1 -Mode IssueEdit -Issue <number> -SpecFile <issue-card.json>
node tools/issue-card.mjs --validate <issue-body.md>
```

`tools/create-issue-card.ps1` renders the body, validates the required metadata
and heading order, then writes through `tools/safe-gh-write.ps1` for readback
verification. If an issue was created through a GitHub form or another route,
edit it into this Markdown shape before using it as a worker's implementation
contract.

Worker completion reports should use the same fields and add:

```text
PR/status:
```

If the worker cannot archive its own completed thread but all closeout
conditions are satisfied, its final chat response must include:

```text
ARCHIVE_OK: yes
```

`ARCHIVE_OK: yes/no` is a chat-closeout marker for thread lifecycle decisions.
GitHub issue or PR closeout comments may mirror it, but they do not replace the
required marker in the worker's final chat response.

The owning worker also owns parent/source chat closeout when it has the parent
`CHAT_TITLE`/`THREAD_ID` and all closeout conditions are satisfied. After merge,
branch and worktree cleanup, `git worktree prune`, and final status, it archives
or requests archival for the source task chat itself. Never archive the
permanent Master/Control chat, and do not archive a parent chat with unresolved
task cards, blockers, missing verification, or follow-up ownership still inside
it.

When a task comes from an existing chat, Guy-facing queue reports must keep the
source chat title and thread ID. Queue summaries shown to Guy must start every
item with:

```text
CHAT_TITLE:
THREAD_ID:
Task:
Branch:
Goal:
Approach:
Tests:
Risk:
Done when:
Future protection:
```

Use the actual Codex chat title and thread ID. Do not invent task names to
stand in for chat identity.

## Issue Hierarchy

Use issues for all tasks. This is the GitHub-only version of a TFS/Azure DevOps hierarchy.

Issue types:

- Mission: large outcome, like an Epic.
- User story: user-facing or workflow-facing slice under a mission.
- Task: one implementable unit for one worker.
- Bug: defect or regression.
- Research: investigation that produces a decision, report, or next task list.
- Docs: documentation-only work.
- Cleanup: maintenance or repo hygiene.

Standalone issues are allowed. Not every issue needs a parent mission. For bigger work, link children from the mission issue with GitHub sub-issues, not just body text. Missions can be nested under missions this way. Group broad lanes under mission issues instead of scattering sibling cards; for example, RAG work belongs under the RAG mission and podcast/Q&A/STT work belongs under the Audio Knowledge mission.

Active mission parents track current/open children. Do not keep closed/Done children nested under an Active mission when GitHub Projects renders them inside the expanded parent on the `Active Missions` view. Completed issues stay as Done/history rows in the Project; detach them from the active parent during patrol cleanup unless Guy explicitly asks to preserve historical sub-issue progress on that mission.

Every non-standalone story, task, bug, research, docs, or cleanup issue must include `Parent: #<issue-number>` in the issue body. Standalone work must explicitly say `Parent: standalone`.

`Parent: #<issue-number>` is the human-readable fallback, not the live hierarchy. After creating or reparenting an issue, run:

```powershell
tools/link-issue-parent.ps1 -Parent <parent-issue-number> -Child <child-issue-number>
```

Use `-ReplaceParent` only when intentionally moving a child from one parent to another. GitHub Projects then populates the built-in `Parent issue` and `Sub-issues progress` fields.

Every issue body should include the #273-style metadata and sections:

- `Type`, `Priority`, and `Parent: #<issue-number>` or `Parent: standalone`
- `Related` when there is a useful linked issue
- `Task`
- `Branch`
- `Goal`
- `Approach`
- `Tests`
- `Risk`
- `Done when`
- `Future protection`

Worker thread links, PR links, current lease/status, and next action belong in
Project fields and issue comments once work starts, unless they are part of the
original task scope.

## Project Fields And Labels

Use one required GitHub Project status field:

- Backlog: captured but not ready for implementation.
- Ready: approved and ready for a worker.
- Active: worker is doing the work, including self-review/merge/cleanup.
- Review: optional external review requested or a worker-declared review
  blocker is active.
- Blocked: cannot proceed until a named blocker changes.
- Done: merged, closed, or otherwise complete.

Use labels and issue comments for conditions that are not statuses:

- `needs:guy`: exact decision, rating, approval, or secret is needed.
- `stale-check`: active work needs a queue/audit stale check.
- `hold:guy` / `hold:ops`: do not merge or deploy.
- `external-impact`: approval boundary exists.
- `parked`: valid work that is intentionally not current.

Use these approved project fields once available in GitHub Projects:

- Type: Mission, Feature, Task, Bug, Research, Docs, Cleanup.
- Urgency: Urgent, High, Normal, Later.
- Owner: human or AI worker responsible for the next action.
- Worker Thread: Codex/chat link or ID.
- Reviewer Thread: optional reviewer chat or human reviewer when separate
  review is explicitly required.
- Last Useful Update: timestamp of the latest meaningful Project update,
  worker status comment, PR status, or final chat handoff. Do not create issue
  comments solely to refresh this field.
- External Impact: none, pending approval, approved, completed.

Use `Urgent` for podcast issues, secret/credential issues, and Supabase reorganization work. Use `High` for production/report/email/site breakage and important workflow blockers. Use `Normal` for regular approved work. Use `Later` for parked/backlog work and RAG work unless Guy explicitly pulls RAG into the current focus.

Do not create or require an `Area` Project field. It is intentionally retired; mission hierarchy, `Type`, `Urgency`, labels, and issue titles are enough.

Project fields must also be visible in each saved Project view. The `Active Missions` and `Done Missions` table views should include `Type` and `Urgency` columns near `Status`; field creation/backfill alone is not enough because GitHub can hide populated fields per view. GitHub's public Project API can read view fields but does not currently expose a mutation for saved-view visible columns, so use the Project UI when view columns drift.

## Taskboard Operating Model

The GitHub Project is the live taskboard. It should answer what is ready, active, in review, blocked, and done without reading old chats.

Use the board like this:

- `Ready` is the launch queue.
- `Active` is work currently owned by a worker, including PR self-review and
  merge/cleanup when applicable.
- `Review` is work waiting on optional external review or a worker-declared
  review blocker.
- `Blocked` is work with a named blocker and next owner.
- `Done` is closed/completed history, not part of the active queue.

Claiming an issue is a board update, not only a chat note. When a worker takes
an issue, before implementation edits or silent local setup it must add the
issue to the Project if needed, move `Status` to `Active`, set `Owner` and
`Worker Thread`, and record the branch in the issue body, Project fields where
available, or the first worker status comment. The worker then posts the
`LEASE: active` status comment with `tools/claim-task.ps1`. If Project mutation
is unavailable, the worker must comment with the attempted board update and the
exact blocker before doing implementation work so a queue/audit lane can repair
the board.

GitHub Project API or GraphQL rate-limit errors are board-sync blockers, not
implementation blockers, once the issue exists and the worker lease/status
comment has been written. If a Project field mutation or readback hits a
secondary rate limit, timeout, or transient reset message, record `board sync
deferred` with the attempted field values and continue the approved task. Stop
only when the primary GitHub API quota is actually exhausted until reset, auth
or scopes prevent the required issue/lease claim, a duplicate active lease
exists, or the Project failure hides an ownership conflict. Do not retry broad
Project scans just to prove the same deferred board sync; queue/audit can repair
the board later from issue, branch, PR, and lease evidence.

Done missions and tasks should be visually separate from live work. The preferred board view groups or filters by `Status` so `Done` appears as its own lane/section or in a dedicated done/history view. Active views should be sorted or manually ordered by `Urgency` first: `Urgent`, `High`, `Normal`, then `Later`. Do not mix done missions into the active mission list except when auditing history.

Mission nesting uses GitHub sub-issues. The Project's built-in `Parent issue` and `Sub-issues progress` fields show hierarchy/progress once `tools/link-issue-parent.ps1` has linked the issues. A mission can contain child missions, stories, tasks, bugs, research issues, docs issues, or cleanup issues.

For active mission issues, keep the hierarchy focused on open/current children. GitHub Projects can show closed sub-issues inside an expanded active parent even when the view filter is `-status:Done`, so status patrols should detach closed/Done children from active parents instead of leaving completed history above live work. Done issues remain visible in the separate Done/history view.

Issue titles should describe the work itself, not repeat the board taxonomy. Do not prefix titles with `Bug:`, `Feature:`, or other type/urgency markers; keep those in `Type` and `Urgency`.

The taskboard does not replace issue bodies or PRs. Issue bodies define scope
and acceptance criteria, PRs hold review/check evidence, and the Project holds
queue state.

### Comment Noise Rule

Routine queue/status patrols are board-first. The queue/audit lane should update
Project fields for ordinary status sync and unchanged-state refreshes, not add
one comment per inspected issue. Comments are reserved for material information
that the board cannot express cleanly: new worker/branch/PR routes,
new blockers or Waiting-on-Guy decisions, external-impact boundary changes,
meaningful implementation/test/artifact evidence, corrections to misleading
prior comments, and final merge/closeout/transfer evidence.

If an issue or PR already has the current blocker and evidence, update Project
fields and report the queue summary in chat. Do not manufacture comments merely
to refresh `Last Useful Update` or prove that a patrol ran.

Guy-facing task cards should be short enough to approve without decoding worker
notes. Keep the required fields in this order: `Task`, `Branch`, `Goal`,
`Approach`, `Tests`, `Risk`, `Done when`, and `Future protection`. Use one
approvable outcome per card, write the root cause or decision point first when
there is one, and keep internal audit detail in the source issue or worker
handoff.

Do not add `Non-goals` sections to Guy-facing task cards. Preserve any real
external-impact limit in `Risk` or in the issue body's
`External-impact boundaries` section.

`Tests` must name the behavior being proven and the exact command, artifact
check, fixture, or smoke path when possible. For example, a June 13 report card
should say to reproduce the missing forum data, fix the root cause, regenerate
only after proof, and verify the regenerated report contains the expected forum
items with a focused artifact check plus the required local commands.

Use the approved labels as durable signals and as a fallback when Project automation is awkward:

- `type:mission`, `type:story`, `type:task`, `type:bug`, `type:research`, `type:docs`, `type:cleanup`
- `needs:guy`, `needs:review`, `needs:tests`, `stale-check`, `blocked`
- `hold:guy`, `hold:ops`
- `external-impact`, `deploys-public`, `parked`

For the Project `Type` field, map `type:story` and GitHub `enhancement` work to `Feature`. Keep the `type:*` labels on issues because automation and PR checks use them as durable fallbacks.

External-impact work is not a `Type`. Use the `External Impact` Project field and the `external-impact` label for work that touches production, Supabase, email, broad scraping, secrets, paid APIs, destructive cleanup, or other state outside the local repo/dev environment. Replace legacy external-operation type usage with the normal work type plus `external-impact`.

Do not use docs as the live status board. Status belongs in GitHub
Issues/Projects, PRs, and active queue/audit reports. Docs should describe the
system, not hold constantly changing task state.

## Approval Model

Planner, missions, and tasks should be easy for Guy to approve without ritual language.

Mission approval and task approval are separate:

- Mission approval means the objective, direction, scope boundaries, and rough plan are acceptable.
- Task approval means the named issue or named task batch can start routine repo work.
- A worker should not expand implementation beyond the approved issue without updating the issue and getting approval for the new scope.
- If Guy says "yes" to a clearly proposed batch, the batch is approved.
- If Guy says "yes" to a vague mission idea, only planning is approved until tasks are named.

Use this scale when Guy gives a 1-10 rating:

- 1-3: do not proceed.
- 4-6: refine or split further.
- 7-10: approved enough to start routine work for the named scope.

Always ask before:

- Paid API spend
- Live Supabase writes
- Sending email
- Broad live scraping
- Deleting or renaming production resources
- Changing GitHub secrets or variables
- Removing, blanking, overwriting, or restoring local env/config values in
  gitignored `.env`, cookie, credential, PowerShell User/Machine env, or
  Codex/runtime env stores
- Destructive cleanup

### Provider Credential Reuse Boundary

Provider API keys are shared project infrastructure, not per-feature setup.
When a feature needs Anthropic, Gemini, Voyage, X/Twitter, Supabase, Gmail, or
another provider, the worker must first identify the canonical existing secret
name and destination that should serve it. Do not ask Guy for, open, create,
rotate, or split out a new API key just because the feature is new.

A new or rotated provider key is allowed only when Guy explicitly approves that
provider and destination, the provider requires separate scoped credentials, the
existing key is compromised/revoked, or a hard quota/billing isolation
requirement is documented. If the existing key is unavailable or masked, report
the exact blocker and route through `$kruse-provider-secrets`; do not convert a
missing local value into a new-key request by default.

### Transcript Supabase Completion Boundary

Transcript, media, podcast, Q&A, webinar, powwow, and similar canonical-source
tasks must not hide the live-import decision behind generic no-write language.
Their task card and final closeout must say which one of these states was
delivered:

- `artifact-only`: a local/repo transcript artifact was created or verified,
  with no live import expected.
- `import-ready/no-live-write`: the dry-run import plan includes the row, but
  Supabase was not changed. The closeout must say `not in Supabase` and name
  the exact next approval, credential, or owner needed for the live write.
- `live Supabase imported`: the approved row was written to Supabase and a
  readback proves the exact canonical id/source id, transcript count/hash, and
  no unintended Storage/audio/email/paid side effects.

Do not add generic no-live-write disclaimers to transcript or canonical-source
closeouts. If Guy explicitly chooses an artifact-only or dry-run-only outcome,
or if credentials/approval are genuinely unavailable, say `not in Supabase` and
name the exact next approval, credential, or owner needed for the live write. If
Guy asks whether an item is "in Supabase", "canonical", "uploaded",
"available", or equivalent, the worker must either perform the scoped live
import with readback proof or report the exact blocker; it must not call an
import-ready artifact done as though it were live.

Public-site/GitHub Pages deployment:

- Deploy only when public-site or GitHub Pages code/config changed.
- If such code/config changed, deployment after merge is part of the task once
  checks pass, unless Guy or an explicit issue/Project hold blocks it.
- Public-site changes must run `npm run prod-check` from `kruse-summary/` before merge.

## Fast Incident Response

For urgent production incidents, the incident owner first diagnoses only enough to
choose the next action, then quickly triggers the fix, redeploy, rollback,
worker, or monitor lane. It must report concise status before waiting on slow
systems.

Incident status must say the action taken, run/PR/worker link when available,
expected wait, what is being monitored, and what happens on pass or fail.

If verification depends on slow GitHub Actions, GitHub Pages propagation, cache
expiry, or another long external wait, the incident owner creates or continues a
monitor lane or heartbeat instead of silently waiting many minutes in the main
interaction. Synchronous waiting is only for the next user-visible step that
truly depends on immediate completion, or when Guy explicitly asks to stay until
done.

Incident handling does not bypass live safety rules. Do not send email, scrape,
write Supabase, delete secrets or vars, mutate local env/config stores, or
spend paid API credits unless the approved incident card or direct Guy
instruction specifically allows that live action.

## Mission Lifecycle

1. Idea
   - Guy gives a goal, complaint, or rough direction.

2. Planner intake
   - Planner asks only important missing questions.
   - Planner creates or updates a mission issue.

3. Mission planning
   - Planner writes goal, scope boundaries, risks, stories, tasks, and done criteria.
   - Guy approves the mission direction or gives a 1-10 rating.

4. Task breakdown
   - Planner creates task/story issues under the mission when useful.
   - Tasks are small enough for one worker.

5. Task approval
   - Routine tasks can start after Guy approves the named task or named task batch.
   - External-impact tasks wait for explicit approval at the boundary.

6. Worker start
   - One worker gets one issue.
   - The issue number is the worker's `TASK_ID`.
   - Branch name should use the repo's task prefixes, usually `feat/issue-<number>-<short-slug>`, `fix/issue-<number>-<short-slug>`, or `docs/issue-<number>-<short-slug>`.
   - The first worker action is the board claim: ensure the issue is on the
     GitHub Project, move `Status` to `Active`, set `Owner` and `Worker
     Thread`, and record the branch in the issue/status trail.
   - After the board claim, worker claims the issue before editing by running
     `tools/claim-task.ps1 -Issue <number> -WorkerThread <thread-id> -Branch <branch>`.
   - Use a fresh worktree for implementation when practical.
   - Treat the shared root checkout as read-only quarantine for task work. If
     the task needs files, create or use the task worktree first.
   - If Codex/app worktree creation reports `worktree init failed`, do not
     start editing in the shared root checkout. From the repo root, run
     `tools/init-task-worktree.ps1 -Issue <number> -Branch <branch> -Path .codex-worktrees/<task-slug>`
     and use its diagnostics or fallback ladder in `ARCHITECTURE.md`.
   - Never let two workers edit the same dirty tree.

7. Implementation
   - Worker implements scope only.
   - Worker saves task deliverables in tracked repo paths inside the task
     worktree. Local scratch files must be deleted, committed, pushed, or
     explicitly referenced before handoff.
   - Worker adds or updates unit tests and integration/smoke tests for code it adds.
   - Worker keeps durable status current through Project fields, PR body or PR
     comments, and material issue comments when a real transition occurs.
     Routine "still working" comments are non-compliant noise.
   - Worker updates PR status as it goes.

8. Testing
   - Worker runs relevant tests.
   - Worker documents commands and results.
   - Worker documents any test gap rather than hiding it.

9. Review
   - The owning worker self-reviews the PR before asking anyone else to look:
     read the diff, compare it to the approved issue card, check tests and test
     gaps, check external-impact boundaries, and look for artifact/worktree
     hygiene problems.
   - If the worker finds safe issues, it fixes them directly on the same branch,
     reruns the relevant local checks, and updates the PR/status evidence.
   - A finding is safe for the worker to fix when it stays inside the approved
     issue scope, does not require missing domain context, does not touch
     live/external boundaries, does not conflict with another worker's claimed
     files, and does not materially change the approved approach.
   - If a required local check fails, the worker triages it before handing off:
     reproduce on the PR branch, compare with `origin/main` when practical, and
     classify the failure as PR-related, already present on `origin/main`, or
     unproven.
   - Optional separate review is allowed only when Guy asks for it, the issue
     card requires it, the change is high risk, or the worker records an exact
     blocker it cannot safely resolve. That optional reviewer must be labeled
     `review/<short-scope>` and has a clear pass/fail scope; it is not a
     default coordinator or `review-fix/` lane.
   - A blocked review closeout is valid only after the worker explains why it
     cannot safely fix the remaining issue itself and names the exact next
     owner. A failed check by itself is not a blocker report.
   - The worker owns missing-test review. Any accepted test gap must be named
     in the PR/issue closeout with the concrete reason it is acceptable.

10. Merge and closeout
   - The owning worker marks ready, merges, cleans the branch, removes the task
     worktree, runs `git worktree prune`, updates issue/Project status, and
     closes/archives the task chat after self-review, required local checks, and
     acceptance criteria are met, unless Guy or the issue explicitly holds the
     merge.
   - Hand off only for missing domain context, stale/conflicting branches,
     secrets/live actions, an explicit ownership conflict, unsafe cleanup, or an
     issue the worker has proven it cannot safely fix itself.
   - A queue/audit lane may merge only when the owning worker is unavailable or
     stale and merge eligibility is explicit in the PR/issue evidence.
   - Public-site/GitHub Pages deployment happens after merge only when relevant code/config changed.
   - Worker closeout must include an artifact audit: task
     worktree status, shared root status when accessible, and the access route
     for any file Guy or another chat is expected to find.
   - When a task finishes without a PR, the owning worker closes
     the issue/chat only after safe worktree removal and `git worktree prune`, or
     after reporting the exact cleanup blocker and next owner.
   - After successful merge, branch and worktree cleanup, `git worktree prune`,
     and final status, the owning worker archives its own task chat and any
     explicit parent/source chat it is responsible for when it has the parent
     `CHAT_TITLE`/`THREAD_ID` and no unresolved parent work remains. If it
     cannot archive directly, it records the exact archive request in the
     issue/Project trail or transfers it to an explicit audit lane.
   - Every worker, optional review/audit lane, support/research answer, queue
     patrol, and one-off process-correction turn covered by
     [Final Response Closeout](#final-response-closeout) must include
     `ARCHIVE_OK: yes/no` in the final chat response. GitHub issue or PR
     comments may mirror this marker, but they do not replace the final-chat
     requirement.
   - Queue/audit lanes close/update issues and archive stale chats only when
     recovering stale, blocked, superseded, or orphaned work. Routine task
     closeout belongs to the owning worker.

## Automatic Local Gates

Every PR should pass local gates before opening or marking ready:

- Local PR body preflight: `node tools/pr-body-check.mjs --body-file <pr-body.md>`.
- Local PR guard preflight: `node tools/pr-check.mjs --base origin/main`.
- Local config guard, when a task touches config or env behavior:
  `.\tools\local-env-guard.ps1 -Mode Audit -Scope local-codex -AllowMissing`.
  Before any approved local env/config mutation, also run
  `.\tools\local-env-guard.ps1 -Mode Backup -Scope <scope> -AllowMissing`.
- Relevant package tests.
- Artifact hygiene audit: `git status --short --branch` in the task worktree
  and, when accessible, `node tools/root-hygiene-guard.mjs` in the shared root
  checkout.
- Secret, local junk, and old URL scans when the touched area warrants them.
- `npm run prod-check` from `summary/kruse-summary/` for site, email,
  workflow, deploy, docs, or report-rendering changes.

GitHub Actions checks are paused for PRs while Actions minutes are exhausted.
Do not rerun or wait for PR Guard or CI/CD Actions unless Guy explicitly lifts
the pause.

If a local check fails, the worker fixes the branch. We do not explain around
red local verification.

## Worker Status Updates

Routine worker status belongs in Project fields and the automatic queue/audit
patrol ledger, not repeated issue comments. Issue and PR comments are reserved
for material transitions: worker start/replacement, PR open, worker
review/merge/cleanup blockers, failed worktree recovery, real blockers, archive
closeout, abort/error audit trails, and exact Guy decisions.

When a status comment is needed for a material transition, use this shape:

```text
STATUS:
TASK_ID:
ISSUE:
MISSION:
WORKER THREAD:
BRANCH:
WORKTREE:
WORKTREE CLEANUP:
LEASE:
PR:
CURRENT STEP:
TESTS:
BLOCKED:
NEXT ACTION:
NEEDS GUY:
LAST USEFUL UPDATE:
```

Useful means it changes what the Project/audit state knows. "Still working" without
task ID, worker thread, current step, blocker, next action, and timestamp is
not useful. Do not add routine "still working" comments.

Use `LEASE: active` when a worker owns the issue. Use a later status comment
with `LEASE: released` when the worker is replaced, the task is parked, or the
issue is done. For final closeout, `WORKTREE CLEANUP` says `removed + pruned`,
`not applicable`, or `blocked: <reason>; next owner: <owner>`.

## File Reference Access

Workers must not send Guy or another chat a bare file path unless that file is
available in the repo context the recipient is expected to use. Every referenced
file that is part of a handoff, status, review request, or cross-chat
instruction must include where it lives and how to open it:

```text
File reference: [path]
Availability: [origin/main | PR/branch | worker worktree only | published URL]
Open it here: [GitHub main URL | PR/branch URL | absolute worker path + thread/worktree id | public URL]
```

Use `origin/main` only after the file is merged to main. Use `PR/branch` for
reviewable branch artifacts and include the branch name plus GitHub PR or branch
file URL. Use `worker worktree only` only with the absolute worktree path plus
the worker thread or worktree id. Use `published URL` only for artifacts
available through an external URL.

Do not tell another worker to rely on a branch-only or worktree-only file unless
the handoff includes the exact branch, PR, worktree path, and owning thread
context needed to access it.

If a handoff names a generated artifact, PR body, report, screenshot, or task
note, it must be either committed/pushed, published, or listed with this block.
Do not say "saved locally" as the only access instruction.

## Safe GitHub Writes

Multiline GitHub issue/comment/PR bodies must not be passed as command arguments on this Windows/Codex setup. Use `tools/safe-gh-write.ps1`, which writes through `--body-file` and verifies readback. Any repo agent that edits multiline GitHub text directly must verify the body after writing.

## Stale Work

Long-running workers must update durable status when they finish a meaningful
step or hit a blocker. Prefer Project fields and the patrol ledger for routine
state. Use issue/PR comments only for the material transitions listed above.
For active worker chats, queue/audit patrols should treat a worker as stale
when:

- It has been working for more than 2 hours without useful durable status.
- The PR or branch changed but the issue was not updated.
- A PR exists but the worker has not recorded self-review, focused evidence,
  merge/hold status, or an exact blocker in the same worker closeout.
- The issue says active but no worker thread or PR is moving.
- The worker is blocked but did not name the exact blocker.

Stale work must be nudged once with the current issue/task context. If it
remains unclear, the queue/audit lane must classify it as `Blocked`, add the
`parked` label, or replace it with a new worker from the issue state.

The automatic queue/audit patrol in
[`docs/ops/AUTOMATIC_COORDINATION_PATROL.md`](AUTOMATIC_COORDINATION_PATROL.md)
is the durable design for stale detection, failed worktree recovery, quiet
routine status, and exception-only archive decisions.

## Backlog Coverage Audits

When Guy asks for all tasks, all chats, stopped work, WIP, a priority queue, a
Supabase situation, or similar cross-chat coverage, queue/audit must audit
deeper than the latest worker answer before presenting the queue. It must ask
relevant source chats for all unresolved approval-ready cards, cross-check
merged PRs, open PRs, and current `origin/main`, and classify each unresolved or
recently resolved request as `Done/Merged`, `Needs Guy approval`, `Blocked`,
`Active`, or `Backlog`.

Queue/audit may keep the Guy-facing queue concise, but it must preserve full
coverage internally and avoid hiding older unresolved requests behind a single
latest worker response. A worker or queue/audit lane must not collapse a broad
audit to one task, or answer `Task: None`, unless this full-history audit and
PR/main cross-check has been done.

## Worker Count

Default trial limits:

- Unlimited backlog and ready issues.
- 3 active implementation workers.
- 2 PRs waiting on optional external review or blocked worker closeout.
- More workers are fine for read-only audits or independent research.
- Fewer workers for risky shared code, production, or dirty-root cleanup.

The queue/audit owner can temporarily exceed these limits only when task owners
can still finish their own review/merge/cleanup work without collision.

## Planner, Queue, And Audit

Do not create a standing coordinator as the default owner for routine tasks. A
planner or queue/audit chat exists to clarify work, launch approved workers, and
recover exceptions; it does not own normal PR review, merge, cleanup, or
archive.

Planner responsibilities:

- Turn vague goals into missions and issues.
- Ask high-value questions.
- Create tasks, user stories, docs/research/cleanup issues, and
  external-impact task cards with `tools/create-issue-card.ps1` or validate the
  final body with `tools/issue-card.mjs`.
- Start workers or draft worker prompts.
- Update statuses.
- Check stale workers.
- Prepare approval-ready choices for Guy.

Queue/audit responsibilities:

- Audit active issues, PRs, branches, checks, and stale workers.
- Run or review the automatic patrol for stale detection, failed worktree
  recovery, quiet status dedupe, and archive candidates.
- Keep Project status aligned with issue/PR state.
- Find PRs whose owning worker should merge, hold, or unblock.
- Find open PRs where the owning worker stopped at review/merge/archive and
  nudge or recover that worker immediately. Do not classify this as
  `Waiting on Guy` unless the missing piece is a specific human decision.
- Search for malformed repo-scoped chat titles during queue patrols, including
  user-opened planner/research/support/audit chats and branch-style task chats.
  Rename clear cases before reporting the queue current.
- Find exact decisions needed from Guy.
- Park or replace unclear workers.
- Run `tools/mission-control.ps1` for a read-only GitHub audit when a quick queue check is needed.
- Ensure a worker's first visible pickup action is the Project board claim:
  issue on board, `Status` set to `Active`, `Owner` and `Worker Thread` set,
  and branch recorded in the issue/status trail before implementation edits.
- Run `tools/claim-task.ps1` or require the worker to run it immediately after
  the board claim and before implementation edits.
- Run `tools/link-issue-parent.ps1 -Parent <parent> -Child <child>` when any non-standalone issue belongs under another issue.
- Use `tools/safe-gh-write.ps1` for multiline issue/comment writes.
- Run `tools/ensure-gh-auth.ps1 -RequireProject` before Project mutations. A failed preflight is an auth-scope blocker, not a workflow-design question. GitHub may report the broader `project` scope instead of `read:project`; that is sufficient.
- Run `tools/sync-github-project-fields.ps1 -ProjectNumber <number>` to create approved Project fields after `gh` has Project scopes. Use `-ForceOptionFields Type,Urgency` when repairing field option colors/descriptions.
- Flag missing parent signals, missing durable worker status, missing linked
  issues, missing PR checklist signals, unreviewed worker PRs, and stale
  workers.
- Treat local PR guard failures as merge blockers. While the GitHub Actions PR pipeline pause is active, do not use `PR Ops Guard` Action status as a merge requirement.

Queue/audit passes are governed by the action gate from
[`docs/ops/AUTOMATIC_COORDINATION_PATROL.md`](AUTOMATIC_COORDINATION_PATROL.md).
Every item found in a patrol, queue check, heartbeat, or audit status
turn must land in exactly one useful state: `Done automatically`, `Active
owner`, `Waiting on Guy`, or `Hard blocker`.

`Waiting on Guy` is allowed only when Guy alone must provide a decision,
secret, live-action approval, or scope choice. Every such item must include:
`Decision needed`, `Guy should say/do`, `Safe default if no answer`, and
`Next owner after approval`. Broad blockers like `approve cleanup`, `decide
PRs`, or `review everything` are non-compliant. If the work is already approved
and the next step is routine, the owning worker acts; if that worker is stale,
the audit lane recovers or replaces it instead of labeling it `Waiting on Guy`.

Allowed queue/audit actions inside an approved scope:

- Archive chats after a mission audit proves they are done, superseded, or
  transferred with no unique unresolved context.
- Close or park stale draft PRs only when the linked issue/PR says they are
  superseded, explicitly out of scope, or already approved for closure.
- Prune clean completed task worktrees when they are merged, exact
  `origin/main` ancestors, or tied to closed/superseded work with no dirty
  state, open PR, active owner, or private submodule risk; then run
  `git worktree prune`.
- Nudge or recover stale workers, malformed titles, incomplete self-review or
  merge closeout, and failed worktree starts when the next action is already
  inside the approved task scope.

Forbidden without explicit approval: dirty, active, open-PR, private, or
ambiguous worktree deletion; GitHub Actions dispatch/reruns while paused; live
Supabase writes; email sends; broad scraping; paid API spend; secret/env
mutation; production resource deletion/rename; or scope/product decisions.

A queue/audit lane that sees the same unchanged finding on two consecutive passes
must stop repeating passive status. It must take an allowed action, park the
item with a specific owner, create or update the durable process bug, or pause
the heartbeat and report the hard blocker.

Queue/audit final responses must also follow the no-naked-archive-no rule from
[Final Response Closeout](#final-response-closeout): `ARCHIVE_OK: no` needs a
Guy-action line, an already-handled line, a concrete next owner/action, and the
reason the agent could not safely finish or transfer it first. If no Guy action
is needed, say `Guy action: None`.

Planner may create docs, issues, project entries, and worker prompts. Planner should not silently merge, deploy, spend money, write live Supabase, send email, or do destructive cleanup.

## Process Feedback Escalation

When Guy flags a workflow failure or says something should not happen again, the
current repo agent must turn that correction into durable behavior before moving
on.

1. Restate the failure in concrete terms.
2. Fix the current stuck item when the next action is clear.
3. Decide where the durable rule belongs: `AGENTS.md`, this workflow doc, a guard/check, a local Codex skill, or a worker prompt template.
4. Open a PR for repo rules/tooling when the repo should carry the behavior, or record why the fix belongs only in local Codex configuration.

For PR review/merge handoff failures, the immediate fix is to recover or nudge
the owning worker to finish its own self-review, safe fixes, local evidence,
merge decision, cleanup, and archive closeout. The durable fix is to make future
workers treat PR creation, self-review, merge eligibility, cleanup, and
`ARCHIVE_OK` as one self-contained task lifecycle.

For repeated user requests, do not treat the second request as a fresh task.
If Guy asks for the same outcome more than once, immediately tell him in plain
words: "You already asked for this; I am checking why it is back on your plate."
Do not ask Guy to restate the context or silently re-plan as if nothing went
wrong. Identify the earlier request or lane if possible, then decide what
failed: missing owner, lost handoff, unclear approval, stale/blocked worker,
failed review/merge closeout, or an automation/process gap. Fix the current item when
the next action is clear. If the task is small enough that repeated AI
coordination is now more expensive than direct human action, say that plainly
and recommend that Guy do the task himself, while still recording the durable
workflow fix needed to prevent the repeat.

For artifact and worktree hygiene failures, the immediate fix is to locate the
stranded file, move it into the proper task branch or publishable route, and
clean any task-created root dirt. The durable fix is to make future workers
audit task worktree status, run `node tools/root-hygiene-guard.mjs` from the
shared root checkout when accessible, and verify file access routes before
handoff.

For chat title failures, the immediate fix is to rename the stored Codex thread
title to the clean role/scope, branch, or lane title. The durable fix is to make
every new repo-scoped chat, worker handoff, and queue/audit patrol verify the
stored thread title and repair malformed titles immediately.

For post-review ownership confusion, the durable rule is:

- The mission/implementation agent owns self-review, safe fixes, local checks,
  ready/merge, cleanup, issue/Project closeout, and archive. It does not leave
  Guy, a planner, queue/audit, or a separate review-fix lane a generic "send this to
  review/merge" request.
- The worker fixes safe findings directly on the PR branch by default.
- The worker reruns local checks, verifies fixes, and gives pass/fail evidence.
- The worker classifies remaining check failures as PR-related, already present
  on `origin/main`, or unproven before handing off.
- The worker may close as blocked only after it explains why it cannot safely
  fix or merge the remaining issue itself and names the exact next owner.
- The worker marks ready and merges after required local checks pass and merge
  eligibility is clear.
- After merge, branch and worktree cleanup, `git worktree prune`, and final
  status, the worker archives its own task chat and any explicit parent/source
  chat it is responsible for, or records the exact archive blocker/access route.
- Queue/audit takes over merge only when the worker is stale, unavailable, or
  explicitly handed off and merge eligibility is already explicit.

## Documentation Locations

- `AGENTS.md`: short entry point and core repo rules.
- `AI_WORKFLOW.md`: quick day-to-day checklist that points here.
- `docs/ops/AI_WORKFLOW.md`: this canonical detailed workflow.
- `docs/ops/ARCHITECTURE.md`: the system architecture and invariants.
- `docs/ops/PR_TESTING.md`: PR and testing requirements.
- `docs/ops/AUTOMATIC_COORDINATION_PATROL.md`: automatic patrol contract for
  failed starts, stale task lifecycle recovery, quiet status, and archive
  decisions.
- `docs/ops/GITHUB_AUTH.md`: GitHub CLI/Codex token scope preflight and repair.
- `docs/ops/OPEN_QUESTIONS.md`: unresolved design questions and pending approvals.
- `.agents/skills/`: repo-scoped AI skills for durable project workflow behavior.
- GitHub Issues/Projects: source of truth for tasks and statuses.
- Optional generated docs: mission closeouts and postmortems. Do not use committed docs as the live status board.
