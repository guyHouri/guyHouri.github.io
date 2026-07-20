# Open Workflow Questions

These questions refine the AI workflow. Answered decisions should be folded into `AI_WORKFLOW.md`, issue templates, PR templates, and skills.

## Answered Decisions

- Plain "yes", "ok", "go", "approved", or equivalent is approval for the current proposed scope.
- Mission approval and task approval are different.
- Mission approval approves direction and planning.
- Task approval approves named task issues or a named task batch for execution.
- Planner may create GitHub issues, docs, task cards, project entries, and worker prompts.
- Every task should have a GitHub issue.
- GitHub Issues are the TFS-like work items: mission, story, task, bug, research, docs, and cleanup.
- Standalone issues are allowed; not every issue needs a parent mission.
- The owning worker is the default PR lifecycle owner: focused proof, self-review, safe fixes, ready/merge when eligible, cleanup, issue/Project closeout, and chat/archive closeout.
- Optional separate review is allowed for risky, unclear, blocked, or explicitly requested PRs, but it is not required for routine task work.
- Missing-test exceptions must be documented and justified in the PR body with `Why acceptable:`.
- Active worker with no useful durable status for more than 2 hours must be checked by queue/audit.
- Do not use committed docs as the live status board.
- Do not build a custom dashboard yet; use GitHub Issues, GitHub Projects, PRs, and queue/audit reports.
- Deploy only when public-site or GitHub Pages code/config changed.
- If public-site or GitHub Pages code/config changed, deployment after merge is expected once checks pass and no hold remains.
- GitHub Project work must pass `tools/ensure-gh-auth.ps1 -RequireProject` before Project mutation.
- GitHub issue number is the task ID. Workers must claim one issue before implementation edits.
- `main` branch protection is enabled with PR review, conversation resolution, no force pushes/deletions, and required checks.
- GitHub Projects is the live taskboard; committed docs explain the system but do not hold live task state.
- Done missions/tasks should be visually separate from active work through a `Done` lane/section or done/history view.
- Mission nesting uses GitHub sub-issues plus the Project's built-in `Parent issue` and `Sub-issues progress` fields.
- The Project uses `Urgency` (`Urgent`, `High`, `Normal`, `Later`) instead of legacy priority-code language.
- `Area` is retired from the Project board model.
- Type/urgency belong in Project fields, not title prefixes.

## Approved Day-One GitHub Setup

These are approved day-one GitHub Project fields:

- Status: Backlog, Ready, Active, Review, Blocked, Done.
- Type: Mission, Feature, Task, Bug, Research, Docs, Cleanup.
- Urgency: Urgent, High, Normal, Later.
- Owner: human or AI worker responsible for the next action.
- Worker Thread: Codex/chat link or ID.
- Reviewer Thread: optional reviewer, audit lane, or human reviewer when separate review is requested.
- Last Useful Update: timestamp of the latest concrete Project update, worker status comment, PR status, or final chat handoff.
- External Impact: none, pending approval, approved, completed.

These are approved labels:

- `type:mission`, `type:story`, `type:task`, `type:bug`, `type:research`, `type:docs`, `type:cleanup`
- `needs:guy`, `needs:review`, `needs:tests`, `stale-check`, `blocked`
- `hold:guy`, `hold:ops`
- `external-impact`, `deploys-public`, `parked`

## Remaining Design Questions

1. Should done Codex chats be archived automatically after issue/PR closeout, or only when the owning worker explicitly marks `ARCHIVE_OK: yes`?
2. Should queue/audit run manually on demand, on a schedule, or both?
