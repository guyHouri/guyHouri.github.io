# PR Testing And Review

This document defines the minimum checks expected before a PR is ready to merge.

## GitHub Actions Pause

Effective June 14, 2026, PR-triggered GitHub Actions are paused while Actions
minutes are exhausted. Do not open, rerun, dispatch, wait for, or require
GitHub Actions for PR work unless Guy explicitly lifts the pause.

PRs still need verification. Use local evidence instead: `node
tools/pr-body-check.mjs --body-file <pr-body.md>`, `node tools/pr-check.mjs
--base origin/main`, relevant focused tests, and `npm run prod-check` from
`summary/kruse-summary/` when production site/email/workflow paths are affected.

## Every PR

Every PR should include:

- `TASK_ID: #<issue-number>`.
- Linked issue.
- Clear task scope.
- Summary of changes.
- Unit tests added or updated for new logic.
- Integration, smoke, or end-to-end checks when behavior crosses module boundaries.
- A behavior-coverage note naming which test, fixture, smoke path, integration path, or manual check exercises the actual changed behavior.
- Exact commands run.
- A note that GitHub Actions were not used while the Actions pause was active.
- Known test gaps and, when a gap remains, a `Why acceptable:` explanation in the PR body.
- Risk notes.
- External-impact and deployment impact.
- Worker lease comment link.
- `Worker / Closeout` evidence naming self-review status, merge owner, and cleanup/archive owner.

Do not mark a PR ready if the worker did not run tests and did not explain why.
Do not mark a PR ready when the only verification is generic green checks that do not exercise the changed behavior.
Do not leave a draft PR sitting at "needs review." The owning worker must self-review, fix safe findings directly on the PR branch, rerun relevant checks, mark ready or merge when eligible, clean up branches/worktrees, close issue/Project state, and archive the task chat. If the worker cannot safely finish those steps, it must record the exact blocker and next owner.

Optional separate review is allowed for risky, unclear, or explicitly requested work. It is not the default owner for routine merge and closeout.

## Worker Test Responsibility

When a worker adds code, the worker is responsible for adding or updating tests for that code. Tests should prove the new or changed behavior works and should be narrow enough that a future regression would fail.

Expected pattern:

- Pure functions: unit tests.
- Parsers/scrapers: fixture or sample-input tests where practical.
- CLI or pipeline behavior: integration or smoke test.
- UI/report rendering: build plus visual or DOM interaction smoke check.
- Production website/report changes: `npm run prod-check` from `summary/kruse-summary/`.

If there is no existing test harness, the worker should add the smallest reasonable test harness or document why that is out of scope and what manual verification was done.

Missing-test handling:

- Worker documents the gap and the reason.
- Worker documents why the available checks do or do not exercise the changed behavior.
- Worker records `Why acceptable:` in the PR body.
- Optional reviewer or queue/audit can request changes when the gap is not credible.
- Guy is asked only when accepting the gap changes product, data, public-site, cost, or operational risk.

## Required Checks By Area

Forum/scraper modules:

- Run relevant unit/integration tests when present.
- Run `npm run status` for the touched module when useful.
- Add fixture/sample-input tests for parser or extraction changes where practical.
- Do not read large `processed_mds/`, `logs/`, or `node_modules/` unless explicitly needed.

Daily summary / production site / GitHub Pages:

- Run package tests when present.
- Run `npm run prod-check` from `summary/kruse-summary/` when touching:
  - `summary/kruse-summary/`
  - `.github/workflows/`
  - Public report HTML generation
  - Website URLs
  - Signup or feedback forms
  - Deployment config
- If public-site or GitHub Pages code/config changed, deployment after merge is expected once checks pass and no hold remains.
- If no public-site or GitHub Pages code/config changed, do not deploy just because a PR merged.

GitHub workflows:

- Validate YAML shape when practical.
- Explain trigger impact.
- Avoid changing secrets or variables without approval.
- Treat workflow changes that affect GitHub Pages deployment as public-site deployment impact.

Supabase/external data:

- Dry-run first when possible.
- External writes require explicit approval.
- PR must say whether external writes were performed.

Email:

- Local render/test is not live email.
- Sending email requires explicit approval.

Docs-only ops changes:

- No code test is required unless templates/scripts changed.
- Worker self-review should still check that docs do not conflict with `AGENTS.md`, `AI_WORKFLOW.md`, and `ARCHITECTURE.md`.

## Worker Self-Review Checklist

Worker should check:

- Does the PR match the linked issue?
- Are there unrelated file changes?
- Is the branch named for the issue with the repo's task prefixes, normally `codex/issue-<number>-<short-slug>`?
- Does `TASK_ID` match the branch issue number?
- Is there a worker lease comment link?
- Are tests meaningful for the changed behavior?
- Would at least one focused test, fixture, smoke path, integration path, or documented manual check fail or reveal the problem if the worker's change were absent or broken?
- Did the worker add unit and integration/smoke coverage where reasonable?
- If tests are missing, is the gap documented with `Why acceptable:`?
- Did required local checks pass?
- Are external-impact boundaries respected?
- Is deployment impact correctly stated?
- Are docs updated if workflow, commands, or user-facing behavior changed?
- Is the PR small enough to finish safely?
- Are issue/project status and links updated?
- Are merge owner and cleanup/archive owner named?

## Ready To Merge

A PR is ready to merge only when:

- Linked issue acceptance criteria are met.
- `TASK_ID` is present and matches the branch issue number.
- Worker lease comment is linked.
- Worker self-review is complete, or an exact blocker/optional reviewer is named.
- Post-review safe fixes, merge, cleanup, and archive are owned by the worker or an explicitly named replacement owner.
- Required tests/checks pass or documented exceptions are justified in the PR body.
- Verification evidence names the specific changed behavior that was exercised.
- Local PR guard passes. While the GitHub Actions pause is active, `PR Ops Guard` Action status is not required.
- No unresolved external-impact approval remains.
- No `hold:guy` or `hold:ops` label remains.
- No unrelated dirty-root changes are included.
- Public-site/GitHub Pages changes passed `npm run prod-check` from `summary/kruse-summary/`, or no public-site/GitHub Pages code/config changed.

The owning worker should merge once ready unless Guy, branch protection, external-impact boundaries, or a named optional reviewer hold the merge.
