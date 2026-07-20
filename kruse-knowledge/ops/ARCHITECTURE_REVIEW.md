# Critical Architecture Review

This review has been folded into the operating docs and templates.

## Current Verdict

Conditionally ready for a small trial after the approved GitHub labels and Project fields are created or synced.

## Findings Now Addressed

- GitHub Project drift: issue forms, PR template, and `tools/mission-control.ps1` now give queue/audit concrete hooks.
- Worker merge guardrails: `PR_TESTING.md` now defines hard merge blockers, holds, deployment checks, worker self-review, and missing-test ownership.
- Two-hour stale checks: worker status updates now belong in issue comments, with Last Useful Update proposed as a Project field.
- Planner audit trail: planner-created work must leave issue links, child links, worker thread links, and next action.
- Worktree fallback: `ARCHITECTURE.md` now defines the branch/worktree fallback ladder and branch naming convention.
- Test exceptions: worker documents and justifies gaps in the PR body; optional review or queue/audit can challenge weak gaps; Guy is asked only for product, data, public-site, cost, or operational risk tradeoffs.
- External-impact boundary: issue templates and PR template now force the boundary to be named.

## Remaining Before Full Automation

- Create or sync the approved labels and Project fields.
- Optional branch protection / PR-check automation for linked issue and checklist completion.
- Decide whether queue/audit runs manually, on a schedule, or both.
