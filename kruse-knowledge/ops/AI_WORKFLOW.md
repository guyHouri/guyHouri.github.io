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
- The GitHub issue number is the task ID. Worker prompts and implementation branches must include it.
- GitHub Issues are also the TFS-like work items: missions, stories, tasks, bugs, research, and operations are all issues with type labels.
- A chat is an execution surface, not the system of record.
- `origin/main` is law. Local worktrees, worker chats, and experiments are
  disposable until reviewed through a PR and merged.
- Task work must not happen directly on `main` or in the shared root checkout.
  Use one branch and one worktree per task, based on current `origin/main`.
- Plain "yes", "ok", "go", "approved", or equivalent from Guy is approval for the current proposed scope. Do not require formal approval phrases.
- Mission approval approves direction and task planning. Task approval approves named task issues or a named batch for execution.
- Routine repo work does not need conversational permission. External-impact work still needs explicit approval at the point where it affects real money, production data, real users, secrets, or destructive external state.
- If public-site or GitHub Pages code/config changed, deployment after merge is expected once checks pass and no hold remains.
- Workers must add or update tests for code they add, including unit tests and integration/smoke tests where the repo has a reasonable test surface.
- Worker test evidence must prove the changed behavior, not only show that broad or unrelated checks are green.
- Workers cannot waive their own missing tests. Reviewer checks test gaps; coordinator accepts exceptions when justified.
- Opening a PR and opening its combined review-fix-merge lane are one handoff. A worker must not stop at "reviewer needed"; it must create or request the `review-fix/pr-<number>-<short-scope>` lane, link it in PR/issue status, or record the exact blocker before ending the turn.
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

Roles are a way to prevent one long chat from planning, implementing, reviewing, and declaring itself done without independent checks.

Allowed roles:

- Planner: turns vague goals into missions, issues, tasks, and worker prompts.
- Coordinator: checks status across issues, PRs, branches, workflows, and worker chats.
- Worker: implements one issue on one branch/worktree.
- Reviewer: reviews one PR or task result from a skeptical stance.
- External Operator: performs external-impact actions after explicit approval.

A chat can switch roles only when it says so clearly and updates the relevant issue/status. A worker should not be its own final reviewer. The planner may create issues, docs, task cards, project fields, and worker prompts. The planner should not silently merge PRs or perform external-impact operations.

## Delegation And Worker Titles

Control Chat and coordinators must keep delegation concise and mechanically
safe. A delegation prompt is assignment context, not implementation approval by
itself. It must carry the approved task scope, not replace it.

Every delegated worker thread title must exactly match the branch or lane it
owns. When the current Codex thread tool exposes a `title` argument, pass that
clean value as the tool title. When the tool does not expose a title argument,
put the clean value in a `Branch:` or `Lane:` line near the top of the prompt
and treat the post-create verify/repair step below as mandatory.

The delegation message body must not contain a line beginning `Chat title:`.
Use `Branch:` for implementation workers or `Lane:` for review, review-fix, and
monitor lanes. This keeps Codex from auto-titling the thread with the literal
`Chat title:` prefix.

After `create_thread` returns a thread id, Control Chat must verify the stored
title by listing or reading the thread. If the stored title does not exactly
match the branch or lane, call `set_thread_title` before presenting the worker
as active.

Title verification means checking the thread's stored `title` field, not the
preview or first line of the delegation body. A review handoff is not complete
until the stored title itself starts with the intended lane, such as
`review-fix/pr-<number>-<short-scope>`.

When `create_thread` returns only a pending worktree id, Control Chat must later
list or read the materialized thread and rename it before presenting the lane as
active. If the app refuses a rename because a thread is unloaded or
unregistered, report that exact blocker and do not mark title cleanup complete.

If an active legacy worker title starts with the literal `Chat title:` prefix,
is a sentence-style title such as `Review PR 123 ...`, or is the raw
`<codex_delegation>...` payload while the body/preview contains a clean branch
or lane, rename it to the clean branch or lane name on the next coordinator
touch. If it cannot be renamed, report the exact blocker.

After creating or coordinating workers for a mission, the coordinator thread
title should become `coordinator/<short-scope>` so the sidebar shows the
coordinator, worker, and review-fix roles without opening each chat. This does
not apply to the permanent Master/Control chat, which keeps its standing title.

Review-fix lane titles must include the PR number and subject or scope, using
`review-fix/pr-<number>-<short-scope>`. Reviewer-only and monitor-only lanes
must be explicitly labeled `review/` or `monitor/`; they do not own
implementation, safe fixes, or merge unless promoted into a `review-fix/` lane.

Worker delegation must include the approved task card, worktree, fresh
`origin/main` base requirement, expected tests, risks, done criteria,
future-protection expectation, PR/status reporting requirements, and final
`ARCHIVE_OK: yes/no` closeout rule.

One delegated worker owns one branch/worktree and one path scope unless there
is an explicit handoff.

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

Worker completion reports should use the same fields and add:

```text
PR/status:
```

If the worker or review-fix lane cannot archive its own completed thread but
all closeout conditions are satisfied, its final chat response must include:

```text
ARCHIVE_OK: yes
```

`ARCHIVE_OK: yes/no` is a chat-closeout marker for thread lifecycle decisions.
GitHub issue or PR closeout comments may mirror it, but they do not replace the
required marker in the worker or review lane's final chat response.

Review-fix lanes also own parent worker chat closeout. After merge, branch
cleanup, and final status, the review-fix lane must archive the parent
implementation worker chat when it has the parent `CHAT_TITLE`/`THREAD_ID` and
all closeout conditions are satisfied. If it cannot archive that parent chat
directly, it must send the coordinator an exact archive request/command naming
the parent `CHAT_TITLE` and `THREAD_ID`. Never archive the permanent
Master/Control chat, and do not archive a parent chat with unresolved task
cards, blockers, missing verification, or follow-up ownership still inside it.

When a task comes from an existing chat, Guy-facing queue reports must keep the
source chat title and thread ID. Priority queues shown to Guy must start every
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
- External-impact operation: task that touches production, Supabase, email, broad scraping, secrets, paid APIs, destructive cleanup, or other state outside the local repo/dev environment.
- Research: investigation that produces a decision, report, or next task list.
- Cleanup: maintenance or repo hygiene.

Standalone issues are allowed. Not every issue needs a parent mission. For bigger work, link children from the mission issue with GitHub sub-issues, not just body text. Missions can be nested under missions this way.

Every non-standalone story, task, bug, research, cleanup, or external operation must include `Parent: #<issue-number>` in the issue body. Standalone work must explicitly say `Parent: standalone`.

`Parent: #<issue-number>` is the human-readable fallback, not the live hierarchy. After creating or reparenting an issue, run:

```powershell
tools/link-issue-parent.ps1 -Parent <parent-issue-number> -Child <child-issue-number>
```

Use `-ReplaceParent` only when intentionally moving a child from one parent to another. GitHub Projects then populates the built-in `Parent issue` and `Sub-issues progress` fields.

Every issue should include:

- Type
- Goal
- Parent mission/story as `Parent: #<issue-number>`, or `Parent: standalone`
- Context and links
- Non-goals
- Acceptance criteria
- Test/verification plan
- External-impact boundaries
- Branch/worktree expectation
- Codex thread link when a worker exists
- PR link when a PR exists
- Current next action

## Project Fields And Labels

Use one required GitHub Project status field:

- Backlog: captured but not ready for implementation.
- Ready: approved and ready for a worker.
- Active: worker/coordinator is doing the work.
- Review: PR or result is ready for independent review.
- Blocked: cannot proceed until a named blocker changes.
- Done: merged, closed, or otherwise complete.

Use labels and issue comments for conditions that are not statuses:

- `needs:guy`: exact decision, rating, approval, or secret is needed.
- `stale-check`: active work needs a coordinator stale check.
- `hold:guy` / `hold:coordinator`: do not merge or deploy.
- `external-impact`: approval boundary exists.
- `parked`: valid work that is intentionally not current.

Use these approved project fields once available in GitHub Projects:

- Priority: P0, P1, P2, P3.
- Area: scraper, summary, site, data, docs, infra, ops.
- Owner: human or AI worker responsible for the next action.
- Worker Thread: Codex/chat link or ID.
- Reviewer Thread: reviewer chat, human reviewer, or review-fix lane.
- Last Useful Update: timestamp of the latest concrete issue comment.
- External Impact: none, pending approval, approved, completed.

## Taskboard Operating Model

The GitHub Project is the live taskboard. It should answer what is ready, active, in review, blocked, and done without reading old chats.

Use the board like this:

- `Ready` is the launch queue.
- `Active` is work currently owned by a worker or coordinator.
- `Review` is work waiting on a reviewer or review-fix lane.
- `Blocked` is work with a named blocker and next owner.
- `Done` is closed/completed history, not part of the active queue.

Done missions and tasks should be visually separate from live work. The preferred board view groups or filters by `Status` so `Done` appears as its own lane/section or in a dedicated done/history view. Do not mix done missions into the active mission list except when auditing history.

Mission nesting uses GitHub sub-issues. The Project's built-in `Parent issue` and `Sub-issues progress` fields show hierarchy/progress once `tools/link-issue-parent.ps1` has linked the issues. A mission can contain child missions, stories, tasks, bugs, research issues, cleanup issues, or external-impact operations.

The taskboard does not replace issue bodies or PRs. Issue bodies define scope and acceptance criteria, PRs hold review/check evidence, and the Project holds queue state.

Guy-facing task cards should be short enough to approve without decoding worker
notes. Keep the required fields in this order: `Task`, `Branch`, `Goal`,
`Approach`, `Tests`, `Risk`, `Done when`, and `Future protection`. Use one
approvable outcome per card, write the root cause or decision point first when
there is one, and keep internal audit detail in the source issue or worker
handoff.

`Tests` must name the behavior being proven and the exact command, artifact
check, fixture, or smoke path when possible. For example, a June 13 report card
should say to reproduce the missing forum data, fix the root cause, regenerate
only after proof, and verify the regenerated report contains the expected forum
items with a focused artifact check plus the required local commands.

Use the approved labels as durable signals and as a fallback when Project automation is awkward:

- `type:mission`, `type:story`, `type:task`, `type:bug`, `type:research`, `type:external-op`, `type:cleanup`
- `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3`
- `area:scraper`, `area:summary`, `area:site`, `area:data`, `area:docs`, `area:infra`, `area:ops`
- `needs:guy`, `needs:review`, `needs:tests`, `stale-check`, `blocked`
- `hold:guy`, `hold:coordinator`
- `external-impact`, `deploys-public`, `parked`

Do not use docs as the live status board. Status belongs in GitHub Issues/Projects, PRs, and active coordinator reports. Docs should describe the system, not hold constantly changing task state.

## Approval Model

Planner, missions, and tasks should be easy for Guy to approve without ritual language.

Mission approval and task approval are separate:

- Mission approval means the objective, direction, non-goals, and rough plan are acceptable.
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
- Destructive cleanup

Public-site/GitHub Pages deployment:

- Deploy only when public-site or GitHub Pages code/config changed.
- If such code/config changed, deployment after merge is part of the task once checks pass, unless Guy or coordinator put a hold on it.
- Public-site changes must run `npm run prod-check` from `kruse-summary/` before merge.

## Fast Incident Response

For urgent production incidents, Master Chat first diagnoses only enough to
choose the next action, then quickly triggers the fix, redeploy, rollback,
worker, or monitor lane. It must report concise status before waiting on slow
systems.

Incident status must say the action taken, run/PR/worker link when available,
expected wait, what is being monitored, and what happens on pass or fail.

If verification depends on slow GitHub Actions, GitHub Pages propagation, cache
expiry, or another long external wait, Master Chat creates or continues a
monitor lane or heartbeat instead of silently waiting many minutes in the main
interaction. Synchronous waiting is only for the next user-visible step that
truly depends on immediate completion, or when Guy explicitly asks to stay until
done.

Incident handling does not bypass live safety rules. Do not send email, scrape,
write Supabase, delete secrets or vars, or spend paid API credits unless the
approved incident card or direct Guy instruction specifically allows that live
action.

## Mission Lifecycle

1. Idea
   - Guy gives a goal, complaint, or rough direction.

2. Planner intake
   - Planner asks only important missing questions.
   - Planner creates or updates a mission issue.

3. Mission planning
   - Planner writes goal, non-goals, risks, stories, tasks, and done criteria.
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
   - Worker claims the issue before editing by running `tools/claim-task.ps1 -Issue <number> -WorkerThread <thread-id> -Branch <branch>`.
   - Use a fresh worktree for implementation when practical.
   - If Codex/worktree creation is unstable, use the fallback ladder in `ARCHITECTURE.md`.
   - Never let two workers edit the same dirty tree.

7. Implementation
   - Worker implements scope only.
   - Worker adds or updates unit tests and integration/smoke tests for code it adds.
   - Worker posts useful status updates as issue comments. Active implementation without a useful issue comment is non-compliant.
   - Worker updates PR status as it goes.

8. Testing
   - Worker runs relevant tests.
   - Worker documents commands and results.
   - Worker documents any test gap rather than hiding it.

9. Review
   - Every PR gets a reviewer chat or explicit reviewer pass.
   - The implementation worker owns the first review handoff. After the draft PR exists, the worker must immediately create or request a combined review-fix-merge lane titled `review-fix/pr-<number>-<short-scope>`, link it in the PR/issue status, and make the next owner explicit.
   - The worker or coordinator must verify that the stored Codex thread title, not just the prompt body, exactly matches that `review-fix/pr-<number>-<short-scope>` lane. If the title is sentence-style, raw delegation XML, or otherwise wrong while the body contains the intended lane, call `set_thread_title` immediately. The PR is still missing a compliant review-fix lane until that repair succeeds.
   - If the worker cannot create the review-fix lane, it must write `Reviewer blocked: <exact blocker>` in the PR or issue status and name who owns the next action. "Needs reviewer" without a lane or blocker is stale work, not a handoff.
   - A coordinator who finds an open PR with no review-fix lane, human reviewer, explicit reviewer pass, or reviewer blocker should create or nudge the review-fix lane immediately instead of asking Guy to notice it.
   - The review-fix lane checks the PR, tests, scope, and external-impact rules.
   - The review-fix lane is not review-only. If it finds issues, it fixes safe findings directly on the PR branch by default, pushes updates to the same PR, reruns required local checks, and verifies the result.
   - A finding is safe for the review-fix lane to fix when it stays inside the approved PR scope, does not require missing domain context, does not touch live/external boundaries, does not conflict with another worker's claimed files, and does not materially change the approved approach.
   - If a required check fails, the review-fix lane must triage it before handing off: reproduce on the PR branch, compare with `origin/main` when practical, and classify the failure as PR-related, already present on `origin/main`, or unproven.
   - A `blocked` review-fix closeout is valid only after the lane explains why it cannot safely fix the remaining issue itself and names the exact next owner. A failed check by itself is not a blocker report.
   - The review-fix lane owns missing-test review.
   - Coordinator accepts missing-test exceptions only by posting or approving a PR comment titled `TEST GAP ACCEPTED`.

10. Merge and closeout
   - The review-fix lane owns marking ready, merge, branch cleanup, and closeout after review, required local checks, and acceptance criteria are met, unless Guy or the coordinator explicitly holds the merge.
   - Hand back to the implementation worker only for missing domain context, stale/conflicting branches, secrets/live actions, an explicit ownership conflict, or an issue the review-fix lane has proven it cannot fix safely itself.
   - Coordinator may merge only when the review-fix lane is unavailable or stale and merge eligibility is explicit.
   - Public-site/GitHub Pages deployment happens after merge only when relevant code/config changed.
   - After successful merge, branch cleanup, and final status, the review-fix lane must archive the parent implementation worker chat when it has the parent `CHAT_TITLE`/`THREAD_ID` and no unresolved parent work remains. If it cannot archive the parent directly, it must send the coordinator the exact parent-chat archive request/command.
   - When a worker or review-fix lane is complete and can only request archiving, its final chat response must include `ARCHIVE_OK: yes/no`. GitHub issue or PR comments may mirror this marker, but they do not replace the final-chat requirement.
   - Coordinator closes/updates issues, archives stale chats, and writes final issue/project status.

## Automatic Local Gates

Every PR should pass local gates before opening or marking ready:

- Local PR body preflight: `node tools/pr-body-check.mjs --body-file <pr-body.md>`.
- Local PR guard preflight: `node tools/pr-check.mjs --base origin/main`.
- Relevant package tests.
- Secret, local junk, and old URL scans when the touched area warrants them.
- `npm run prod-check` from `summary/kruse-summary/` for site, email,
  workflow, deploy, docs, or report-rendering changes.

GitHub Actions checks are paused for PRs while Actions minutes are exhausted.
Do not rerun or wait for PR Guard or CI/CD Actions unless Guy explicitly lifts
the pause.

If a local check fails, the worker fixes the branch. We do not explain around
red local verification.

## Worker Status Updates

Workers must post this as an issue comment when starting, after meaningful steps, before pausing, and when blocked:

```text
STATUS:
TASK_ID:
ISSUE:
MISSION:
WORKER THREAD:
BRANCH:
WORKTREE:
LEASE:
PR:
CURRENT STEP:
TESTS:
BLOCKED:
NEXT ACTION:
NEEDS GUY:
LAST USEFUL UPDATE:
```

Useful means it changes what the coordinator knows. "Still working" without task ID, worker thread, current step, blocker, next action, and timestamp is not useful.

Use `LEASE: active` when a worker owns the issue. Use a later status comment with `LEASE: released` when the worker is replaced, the task is parked, or the issue is done.

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

## Safe GitHub Writes

Multiline GitHub issue/comment/PR bodies must not be passed as command arguments on this Windows/Codex setup. Use `tools/safe-gh-write.ps1`, which writes through `--body-file` and verifies readback. Any coordinator or worker that edits multiline GitHub text directly must verify the body after writing.

## Stale Work

Long-running workers must update status when they finish a meaningful step or hit a blocker. For active worker chats, the coordinator should treat a worker as stale when:

- It has been working for more than 2 hours without a useful issue comment.
- The PR or branch changed but the issue was not updated.
- A PR exists but no `review-fix/pr-<number>-<short-scope>` lane, human reviewer, explicit reviewer pass, or reviewer blocker is linked in the same worker closeout.
- The issue says active but no worker thread or PR is moving.
- The worker is blocked but did not name the exact blocker.

Stale work must be nudged once with the current issue/task context. If it remains unclear, coordinator must classify it as `Blocked`, add the `parked` label, or replace it with a new worker from the issue state.

## Backlog Coverage Audits

When Guy asks for all tasks, all chats, stopped work, WIP, a priority queue, a
Supabase situation, or similar cross-chat coverage, Master Chat must audit
deeper than the latest worker answer before presenting the queue. It must ask
relevant source chats for all unresolved approval-ready cards, cross-check
merged PRs, open PRs, and current `origin/main`, and classify each unresolved or
recently resolved request as `Done/Merged`, `Needs Guy approval`, `Blocked`,
`Active`, or `Backlog`.

Master Chat may keep the Guy-facing queue concise, but it must preserve full
coverage internally and avoid hiding older unresolved requests behind a single
latest worker response. A worker or coordinator must not collapse a broad audit
to one task, or answer `Task: None`, unless this full-history audit and PR/main
cross-check has been done.

## Worker Count

Default trial limits:

- Unlimited backlog and ready issues.
- 3 active implementation workers.
- 2 PRs waiting for review.
- More workers are fine for read-only audits or independent research.
- Fewer workers for risky shared code, production, or dirty-root cleanup.

The coordinator can temporarily exceed these limits only when review capacity is clearly available.

## Planner And Coordinator

Create or maintain a pinned planner/coordinator chat for this repo.

Planner responsibilities:

- Turn vague goals into missions and issues.
- Ask high-value questions.
- Create tasks, user stories, and external-impact operation cards.
- Start workers or draft worker prompts.
- Update statuses.
- Check stale workers.
- Prepare approval-ready choices for Guy.

Coordinator responsibilities:

- Audit active issues, PRs, branches, checks, and stale workers.
- Keep Project status aligned with issue/PR state.
- Find PRs ready to merge.
- Find open PRs missing a `review-fix/pr-<number>-<short-scope>` lane and create or nudge that lane immediately. Do not classify this as `Waiting on Guy` unless the missing piece is a specific human decision.
- Search for malformed review lane titles during queue patrols, especially `Review PR`, `review`, and `Chat title: review-fix` results whose preview/body contains a clean `review-fix/pr-<number>-<short-scope>` lane but whose stored title does not. Rename them before reporting the queue current.
- Find exact decisions needed from Guy.
- Park or replace unclear workers.
- Run `tools/mission-control.ps1` for a read-only GitHub audit when a quick queue check is needed.
- Run `tools/claim-task.ps1` or require the worker to run it before implementation edits.
- Run `tools/link-issue-parent.ps1 -Parent <parent> -Child <child>` when a task, story, research issue, or mission belongs under another issue.
- Use `tools/safe-gh-write.ps1` for multiline issue/comment writes.
- Run `tools/ensure-gh-auth.ps1 -RequireProject` before Project mutations. A failed preflight is an auth-scope blocker, not a workflow-design question. GitHub may report the broader `project` scope instead of `read:project`; that is sufficient.
- Run `tools/sync-github-project-fields.ps1 -ProjectNumber <number>` to create approved Project fields after `gh` has Project scopes.
- Flag missing parent signals, missing worker status comments, missing linked issues, missing PR checklist signals, missing `TEST GAP ACCEPTED` comments, and stale workers.
- Treat local PR guard failures as merge blockers. While the GitHub Actions PR pipeline pause is active, do not use `PR Ops Guard` Action status as a merge requirement.

Planner may create docs, issues, project entries, and worker prompts. Planner should not silently merge, deploy, spend money, write live Supabase, send email, or do destructive cleanup.

## Process Feedback Escalation

When Guy flags a workflow failure or says something should not happen again, the coordinator must turn that correction into durable behavior before moving on.

1. Restate the failure in concrete terms.
2. Fix the current stuck item when the next action is clear.
3. Decide where the durable rule belongs: `AGENTS.md`, this workflow doc, a guard/check, a local Codex skill, or a worker prompt template.
4. Open a PR for repo rules/tooling when the repo should carry the behavior, or record why the fix belongs only in local Codex configuration.

For PR review handoff failures, the immediate fix is to create or nudge the combined `review-fix/pr-<number>-<short-scope>` lane. The durable fix is to make future workers treat PR creation plus review-fix-merge lane creation as one atomic closeout.

For review lane title failures, the immediate fix is to rename the stored
Codex thread title to `review-fix/pr-<number>-<short-scope>`. The durable fix is
to make every worker handoff and coordinator queue patrol verify the stored
thread title, repair malformed titles immediately, and treat the review-fix
lane as missing until that repair succeeds.

For post-review ownership confusion, the durable rule is:

- The review-fix lane fixes safe findings directly on the PR branch by default.
- The review-fix lane reruns local checks, verifies fixes, and gives pass/fail.
- The review-fix lane classifies remaining check failures as PR-related,
  already present on `origin/main`, or unproven before handing off.
- The review-fix lane may close as blocked only after it explains why it cannot
  safely fix the remaining issue itself and names the exact next owner.
- The review-fix lane marks ready and merges after required local checks pass.
- After merge, branch cleanup, and final status, the review-fix lane archives
  the parent implementation worker chat or sends the coordinator an exact
  archive request/command naming the parent `CHAT_TITLE` and `THREAD_ID`.
- Coordinator takes over merge only when the review-fix lane is stale, unavailable, or explicitly handed off.

## Documentation Locations

- `AGENTS.md`: short entry point and core repo rules.
- `AI_WORKFLOW.md`: quick day-to-day checklist that points here.
- `docs/ops/AI_WORKFLOW.md`: this canonical detailed workflow.
- `docs/ops/ARCHITECTURE.md`: the system architecture and invariants.
- `docs/ops/PR_TESTING.md`: PR and testing requirements.
- `docs/ops/GITHUB_AUTH.md`: GitHub CLI/Codex token scope preflight and repair.
- `docs/ops/OPEN_QUESTIONS.md`: unresolved design questions and pending approvals.
- `.agents/skills/`: repo-scoped AI skills for durable project workflow behavior.
- GitHub Issues/Projects: source of truth for tasks and statuses.
- Optional generated docs: mission closeouts and postmortems. Do not use committed docs as the live status board.
