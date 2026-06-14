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

- GitHub Issues hold missions, user stories, tasks, bugs, research, and external-impact operations.
- GitHub issue numbers are task IDs for worker prompts, leases, branches, and PRs.
- GitHub Projects holds stage/status and queue views.
- GitHub Issue comments hold worker status updates and stale-check evidence.
- Git branches/worktrees isolate execution.
- PRs hold code review, checks, and merge state.
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
- External-impact operation issue = live operation that needs boundary approval.
- Cleanup issue = maintenance or repo hygiene.

Standalone task and bug issues are allowed. Bigger work must use a mission issue with linked child user stories/tasks. Use GitHub sub-issues for live hierarchy; the `Parent: #<issue-number>` line is the human-readable fallback. Missions can be nested under missions when the work is itself a larger outcome.

Any non-standalone story, task, bug, research, cleanup, or external operation must include `Parent: #<issue-number>` in the issue body. Standalone work must explicitly say `Parent: standalone`. The coordinator audit flags missing parent signals.

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
- `type:external-op`
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
- Priority: P0, P1, P2, P3.
- Area: scraper, summary, site, data, docs, infra, ops.
- Owner: human or AI worker responsible for next action.
- Worker Thread: Codex/chat link or ID when applicable.
- Reviewer Thread: reviewer chat, human reviewer, or review-fix lane.
- Last Useful Update: timestamp of the last concrete issue comment.
- External Impact: none, pending approval, approved, completed.

The GitHub Project is the live taskboard. Active queue views should show `Ready`, `Active`, `Review`, and `Blocked` work. `Done` work should be visually separate as a closed/history lane or filtered view so completed missions do not look like current work. The Project's built-in `Parent issue` and `Sub-issues progress` fields carry hierarchy/progress for nested missions once the issues are linked with GitHub sub-issues.

Use these approved day-one labels when project-field automation is unavailable or when PR checks need easy signals:

- Type: `type:mission`, `type:story`, `type:task`, `type:bug`, `type:research`, `type:external-op`, `type:cleanup`
- Priority: `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3`
- Area: `area:scraper`, `area:summary`, `area:site`, `area:data`, `area:docs`, `area:infra`, `area:ops`
- Workflow: `needs:guy`, `needs:review`, `needs:tests`, `stale-check`, `blocked`
- Holds: `hold:guy`, `hold:coordinator`
- External: `external-impact`, `deploys-public`
- Queue condition: `parked`

Stale is not a status. Stale is a check condition based on missing useful issue comments, especially active workers with no useful update for more than 2 hours. A useful update must be an issue comment with the worker status block from `AI_WORKFLOW.md`.

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
- Claim the issue with `tools/claim-task.ps1` before implementation edits.
- Use a clean fallback branch only if no other worker edits that tree.
- Implement scope only.
- Add or update unit tests for new logic.
- Add or update integration/smoke tests when behavior crosses module boundaries.
- Open/update PR.
- Report test commands and results in the PR and issue.
- Post useful status updates as issue comments. Active implementation work without a useful issue comment is non-compliant.

Worktree fallback order:

1. Fresh Codex worktree for the issue.
2. Clean existing worktree dedicated to that issue.
3. Local branch in a clean tree only if no other worker touches that tree.
4. Research-only chat if code isolation is not safe.

Never let two implementation workers edit the same dirty tree.

### Reviewer Chat

Every PR should get independent review. The reviewer checks scope, tests, risks, and merge readiness.

Reviewer owns missing-test review. A worker can explain a test gap, but the worker cannot waive it. The reviewer must request changes when reasonable tests are missing. The coordinator can accept a documented exception for low-risk, docs-only, tooling-only, or no-existing-harness cases. The exception must be recorded in a PR comment titled `TEST GAP ACCEPTED` with reviewer, coordinator, risk, and reason. Guy is needed only when accepting the gap changes product, data, public-site, cost, or operational risk.

Reviewer should merge after checks pass and acceptance criteria are met, unless Guy or the coordinator explicitly holds the merge.

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
- Requires active implementation workers to claim a task with `tools/claim-task.ps1`.
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
- Status lives in GitHub Issues/Projects and PRs.
- Useful worker updates live as issue comments.
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
