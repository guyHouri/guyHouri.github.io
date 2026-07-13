# AI Task System Architecture

This is the architecture for managing AI-assisted work in `guyHouri/kruse-knowledge`.

## Goal

Make AI workers useful without letting chat history become the source of truth.

The system should answer, at any time:

- What are we trying to accomplish?
- What is approved?
- What is active?
- Who owns the next action?
- Which PRs are ready?
- Which chats are stale?
- What can run locally without asking Guy again?
- What external-impact action needs explicit approval?

## Source Of Truth

GitHub is the durable operating layer:

- GitHub Issues hold missions, user stories, tasks, bugs, research, docs, and cleanup work.
- GitHub issue numbers are task IDs for worker prompts, leases, branches, and PRs.
- GitHub Projects holds stage/status and queue views.
- GitHub Project fields and the automatic coordination patrol ledger hold
  routine worker/review status. GitHub Issue and PR comments hold only material
  transitions, blockers, handoffs, archive closeouts, and exact Guy decisions.
- Git branches/worktrees isolate execution.
- PRs hold code review, checks, and merge state.
- The automatic coordination patrol reconciles Project, issue, PR, branch,
  worktree, failed-start, chat, and archive state. See
  `docs/ops/AUTOMATIC_COORDINATION_PATROL.md`.
- GitHub Actions holds CI/build/test evidence when Actions are enabled. While Actions minutes are exhausted, PR evidence comes from local checks documented in the PR.

Chats are not the source of truth. Chats are workers, planners, reviewers, or coordinators that update GitHub state.

Docs are not the live status board. Docs define the operating system, templates, rules, architecture, and postmortems.

If state conflicts, GitHub issue/PR/project state beats chat memory.

## TFS-Style Model In GitHub

GitHub Issues are the single task object. TFS-style hierarchy is represented with issue types, issue links, and project views:

- Mission issue = Epic.
- User story issue = user-facing slice or workflow slice.
- Task issue = one implementable unit for one worker.
- Bug issue = defect or regression.
- Research issue = investigation that produces a decision, report, or next tasks.
- Docs issue = documentation-only work.
- Cleanup issue = maintenance or repo hygiene.

Standalone task and bug issues are allowed. Bigger work must use a mission issue with linked child user stories/tasks. Use GitHub sub-issues for live hierarchy; the `Parent: #<issue-number>` line is the human-readable fallback. Missions can be nested under missions when the work is itself a larger outcome. Broad lanes should become mission issues with children, not loose title-prefixed cards.

Any non-standalone story, task, bug, research, docs, or cleanup issue must include `Parent: #<issue-number>` in the issue body. Standalone work must explicitly say `Parent: standalone`. The coordinator audit flags missing parent signals.

## Components

### `AGENTS.md`

Short entry point for every repo-scoped chat. It should stay small and point to detailed ops docs.

### `docs/ops/`

Human-readable operating manual:

- `AI_WORKFLOW.md`: mission, task, chat, status, approval, stale-worker workflow.
- `PR_TESTING.md`: testing and review gates.
- `GITHUB_AUTH.md`: GitHub CLI/Codex token scope preflight and repair.
- `ARCHITECTURE.md`: this architecture.
- `OPEN_QUESTIONS.md`: unresolved decisions and pending approvals.

### GitHub Issue

Every task gets an issue. Every issue should have one type label:

- `type:mission`
- `type:story`
- `type:task`
- `type:bug`
- `type:research`
- `type:docs`
- `type:cleanup`

### GitHub Project Board

Use one required status field:

- Backlog
- Ready
- Active
- Review
- Blocked
- Done

Use labels for workflow conditions: `needs:guy`, `stale-check`, `hold:guy`, `hold:coordinator`, `external-impact`, `deploys-public`, and `parked`.

Use these approved day-one project fields:

- Status: the one workflow field above.
- Type: Mission, Feature, Task, Bug, Research, Docs, Cleanup.
- Urgency: Urgent, High, Normal, Later.
- Owner: human or AI worker responsible for next action.
- Worker Thread: Codex/chat link or ID when applicable.
- Reviewer Thread: reviewer chat, human reviewer, or review-fix lane.
- Last Useful Update: timestamp of the last meaningful Project update, worker
  status comment, PR status, or final chat handoff. Do not create comments just
  to refresh this field.
- External Impact: none, pending approval, approved, completed.

`Urgent` is reserved for podcast issues, secret/credential issues, and Supabase reorganization work. RAG is `Later` unless Guy explicitly pulls it into the current focus. `Area` is intentionally not a Project field; mission hierarchy and labels carry enough grouping context.

Saved Project views must expose the fields that Guy is expected to scan. `Active Missions` and `Done Missions` should show `Type` and `Urgency` near `Status`; otherwise the data can be correct but invisible in the table. GitHub's public Project API can read these view fields, but visible-column changes are a Project UI operation. Active views should be sorted or manually ordered by `Urgency`: `Urgent`, `High`, `Normal`, then `Later`.

The GitHub Project is the live taskboard. Active queue views should show `Ready`, `Active`, `Review`, and `Blocked` work. `Done` work should be visually separate as a closed/history lane or filtered view so completed missions do not look like current work. The Project's built-in `Parent issue` and `Sub-issues progress` fields carry hierarchy/progress for nested missions once the issues are linked with GitHub sub-issues.

When a worker picks up an issue, the first visible action is a Project board
claim: add the issue to the Project if missing, set `Status` to `Active`, set
`Owner` and `Worker Thread`, and record the branch in the issue/status trail
before implementation edits or silent local setup.

Use these approved day-one labels when project-field automation is unavailable or when PR checks need easy signals:

- Type: `type:mission`, `type:story`, `type:task`, `type:bug`, `type:research`, `type:docs`, `type:cleanup`
- Workflow: `needs:guy`, `needs:review`, `needs:tests`, `stale-check`, `blocked`
- Holds: `hold:guy`, `hold:coordinator`
- External: `external-impact`, `deploys-public`
- Queue condition: `parked`

On the GitHub Project board, `type:story` and GitHub `enhancement` work should appear as `Feature` in the `Type` field. Keep the labels because they remain the durable automation fallback. External-impact work is tracked with the `External Impact` field and `external-impact` label, not as a `Type`. Issue titles should not repeat taxonomy prefixes; the Project fields carry that.

Stale is not a status. Stale is a check condition based on missing useful
durable status, especially active workers with no useful update for more than
2 hours. Routine durable status belongs in Project fields and the automatic
coordination patrol ledger. Issue and PR comments are for material transitions
and blockers, not repeated "still working" updates.

### Planner Chat

Pinned planning/coordinator chat.

Allowed to:

- Create issues
- Create project entries/fields when tools allow
- Create docs
- Start worker chats
- Draft worker prompts
- Update issue status
- Nudge stale workers

Not allowed to silently:

- Merge PRs
- Deploy
- Spend money
- Write live Supabase
- Send email
- Change secrets
- Do destructive cleanup

Planner-created work must leave an audit trail: issue links, child issue links, worker thread links, and current next action.

### Worker Chat

One worker owns one issue.

Expected to:

- Treat the GitHub issue number as `TASK_ID`.
- Work in a fresh worktree when practical.
- Use branch name `codex/issue-<number>-<short-slug>`.
- Claim the Project board row before implementation edits, then post the
  `LEASE: active` issue status with `tools/claim-task.ps1`.
- When Codex/app worktree creation fails, run
  `tools/init-task-worktree.ps1 -Issue <number> -Branch <branch> -Path .codex-worktrees/<task-slug>`
  before considering any shared-tree fallback.
- Use a clean fallback branch only if no other worker edits that tree.
- Implement scope only.
- Add or update unit tests for new logic.
- Add or update integration/smoke tests when behavior crosses module boundaries.
- Open/update PR.
- Report test commands and results in the PR.
- Keep durable status current through Project fields, PR status/body/comments,
  and material issue comments when a real transition occurs. Routine "still
  working" comments are non-compliant noise.

Worktree fallback order:

1. Fresh Codex worktree for the issue.
2. `tools/init-task-worktree.ps1` from the repo root to create the branch and
   worktree from current `origin/main`, or to print exact diagnostics for the
   conflicting branch/path.
3. Clean existing worktree dedicated to that issue, accepted only after the
   helper reports it clean with `-UseExistingWorktree`.
4. Local branch in a clean tree only if no other worker touches that tree and a
   coordinator records why normal worktree isolation is unavailable.
5. Research-only chat if code isolation is not safe.

Never let two implementation workers edit the same dirty tree.

### Reviewer Chat

Every PR should get independent review. The reviewer checks scope, tests, risks, and merge readiness. A `review-fix/` reviewer also fixes safe findings directly on the PR branch by default, reruns checks, and may report blocked only after explaining why it cannot safely fix the remaining issue itself and naming the next owner.

Reviewer owns missing-test review. A worker can explain a test gap, but the worker cannot waive it. The reviewer must request changes when reasonable tests are missing. The coordinator can accept a documented exception for low-risk, docs-only, tooling-only, or no-existing-harness cases. The exception must be recorded in a PR comment titled `TEST GAP ACCEPTED` with reviewer, coordinator, risk, and reason. Guy is needed only when accepting the gap changes product, data, public-site, cost, or operational risk.

Reviewer should merge after checks pass and acceptance criteria are met, unless Guy or the coordinator explicitly holds the merge. If checks fail, the review-fix lane must classify the failure as PR-related, already present on `origin/main`, or unproven before handing off.

Hard merge blockers:

- Missing linked issue.
- Missing required parent signal on non-standalone work.
- Missing independent reviewer pass.
- Required checks failed or were skipped without accepted exception.
- Missing required tests without a `TEST GAP ACCEPTED` comment.
- `hold:guy` or `hold:coordinator` label.
- Unresolved external-impact approval.
- Public-site/GitHub Pages code changed without required production check.
- Unrelated dirty-root changes included.

The `PR Ops Guard` GitHub Action enforces linked issue, parent signal, required checklist completion, hold labels, and `TEST GAP ACCEPTED` comment shape for new or updated PRs when Actions are enabled.
While the June 14, 2026 Actions-minute pause is active, the same gates are enforced by local PR review and `node tools/pr-check.mjs --base origin/main`; PRs must not wait for or rerun GitHub Actions.
It also enforces `TASK_ID`, branch issue-number match, and a worker lease comment link when enabled.

### Coordinator

The coordinator keeps the system honest:

- Reads GitHub issues/projects, PRs, branches, Actions, and worker chats.
- Finds stale workers.
- Finds PRs ready to merge.
- Finds exact decisions needed from Guy.
- Keeps active work from exceeding review capacity.
- Replaces or parks unclear workers.
- Runs or reviews a mission-control audit before claiming the board is current.
- Uses `tools/safe-gh-write.ps1` for multiline GitHub writes.
- Requires active implementation workers to claim the Project board row before
  implementation edits and then post the lease with `tools/claim-task.ps1`.
- Runs `tools/sync-github-project-fields.ps1 -ProjectNumber <number>` after GitHub Project auth scopes are available.
- Runs `tools/ensure-gh-auth.ps1 -RequireProject` before any GitHub Project mutation. If it reports the Codex `GH_TOKEN` shim problem, do not retry Project commands until auth scopes are fixed.

Default trial limits:

- Maximum 3 active implementation workers.
- Maximum 2 PRs waiting for review.
- More read-only research workers are okay if they do not create review debt.

## Mission Flow

```text
Idea
  -> Planner intake
  -> Mission issue
  -> User stories/tasks
  -> Guy approval or rating for mission direction
  -> Task or task-batch approval for named execution scope
  -> Worker issues
  -> Worker implementation
  -> Tests
  -> PR
  -> Reviewer
  -> Merge
  -> Deployment when public-site code/config changed
  -> Mission closeout
```

## Approval

Mission approval and task approval are different.

- Mission approval means the goal, direction, and rough plan are approved.
- Task approval means named task issues or a named task batch can start routine work.
- New task scope beyond the approved issue/batch needs an updated issue and approval.
- Plain "yes", "ok", "go", "approved", or equivalent from Guy approves the current proposed scope.

Use the 1-10 scale when Guy gives one:

- 1-3: do not proceed.
- 4-6: refine or split.
- 7-10: approved enough to start routine work for the named scope.

External-impact work needs explicit approval at the boundary where it affects the real outside world.

External-impact means actions that can:

- Spend money.
- Mutate production data.
- Send real messages/email.
- Scrape broadly/live.
- Change secrets or variables.
- Delete or rename production resources.
- Perform destructive cleanup.

Public-site/GitHub Pages deployment rule:

- If a PR changes public-site or GitHub Pages code/config, deployment after merge is expected once checks pass and no hold remains.
- If a PR does not change public-site or GitHub Pages code/config, do not deploy just because other work merged.
- Changes touching `kruse-summary/`, `.github/workflows/`, public report HTML generation, website URLs, signup/feedback forms, or deployment config must run `npm run prod-check` from `kruse-summary/` before merge.

## Invariants

- Every task has an issue.
- Every implementation branch and worker prompt includes the issue number as `TASK_ID`.
- Every implementation issue has one branch/worktree owner.
- Every PR has a reviewer.
- Worker adds tests for code it adds.
- Worker cannot waive its own missing tests.
- `AGENTS.md` stays small.
- Docs define the system but do not become the live task board.
- Status lives in GitHub Projects, PRs, the automatic coordination patrol
  ledger, and material issue/PR comments.
- Useful worker updates are durable and quiet by default; issue comments are
  reserved for material transitions and blockers.
- Stale active worker over 2 hours gets checked.
- Missing-test exceptions live in a PR comment titled `TEST GAP ACCEPTED`.
- A worker does not self-approve final merge.
- If state conflicts, GitHub issue/PR state beats chat memory.

## Future Automation

After the manual workflow proves itself:

- Create/sync the approved GitHub Project fields with `tools/sync-github-project-fields.ps1`.
- Re-enable GitHub Actions checks for linked issue and PR checklist completion only after Guy lifts the Actions-minute pause.
- Create a `kruse-mission-planner` skill.
- Extend `tools/mission-control.ps1` to read GitHub Project fields when GitHub Project API access is available.
- Consider a dashboard only after the GitHub-only workflow works for real missions.
