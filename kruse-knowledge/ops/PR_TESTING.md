# PR Testing And Review

This document defines the minimum checks expected before a PR is ready to merge.

## GitHub Actions Pause

Effective June 14, 2026, PR-triggered GitHub Actions are paused while Actions
minutes are exhausted. Do not open, rerun, dispatch, wait for, or require
GitHub Actions for PR work unless Guy explicitly lifts the pause.

PRs still need verification. Use local evidence instead: `node
tools/pr-body-check.mjs --body-file <pr-body.md>`, `node tools/pr-check.mjs
--base origin/main`, relevant focused tests, and `npm run prod-check` from
`kruse-summary/` when production site/email/workflow paths are affected.

## Every PR

Every PR should include:

- `TASK_ID: #<issue-number>`.
- Linked issue.
- Clear task scope.
- Summary of changes.
- Unit tests added or updated for new logic.
- Integration, smoke, or end-to-end checks when the code crosses module boundaries.
- A behavior-coverage note naming which test, fixture, smoke path, integration path, or manual check exercises the actual changed behavior.
- Exact commands run.
- A note that GitHub Actions were not used while the Actions pause was active.
- Known test gaps.
- Risk notes.
- External-impact and deployment impact.
- Verified review-fix lane evidence: `review-fix/pr-<number>-<short-scope>`,
  real Codex thread id, and exact stored title, or an explicit
  reviewer-handoff blocker.
- Post-review fix owner and merge owner.
- Worker lease comment link.

Do not mark a PR ready if the worker did not run tests and did not explain why.
Do not mark a PR ready when the only verification is generic green checks that do not exercise the changed behavior.
Do not leave a draft PR sitting at "needs review." Opening the PR and
materializing the combined `review-fix/pr-<number>-<short-scope>` Codex lane
are one worker-owned handoff. The implementation worker must create the lane,
verify `list_threads` shows a real thread id and exact stored title, repair a
wrong stored title with `set_thread_title`, and write that verified evidence
back to the PR/Project row before it can stop. `Review requested`,
`reviewer needed`, PR/Project comments, and `pendingWorktreeId` are temporary
states, not a completed handoff.
Do not leave post-review ownership implicit. The combined `review-fix/pr-<number>-<short-scope>` lane owns review, safe fixes on the PR branch, check reruns, ready/merge, and cleanup. A concrete blocker is valid only after the lane explains why it cannot safely fix the remaining issue itself, classifies any remaining check failure as PR-related, already present on `origin/main`, or unproven, and names the exact next owner.

## Worker Test Responsibility

When a worker adds code, the worker is responsible for adding or updating tests for that code. Tests should prove the new or changed behavior works and should be narrow enough that a future regression would fail.

Expected pattern:

- Pure functions: unit tests.
- Parsers/scrapers: fixture or sample-input tests where practical.
- CLI or pipeline behavior: integration or smoke test.
- UI/report rendering: build plus visual or DOM interaction smoke check.
- Production website/report changes: `npm run prod-check` from `kruse-summary/`.

If there is no existing test harness, the worker should add the smallest reasonable test harness or document why that is out of scope and what manual verification was done.

A worker cannot waive its own missing tests. Missing-test handling:

- Worker documents the gap and the reason.
- Worker documents why the available checks do or do not exercise the changed behavior.
- Reviewer decides whether the missing test is acceptable or requests changes.
- Coordinator can accept an exception for docs-only, tooling-only, low-risk changes, or places with no practical test surface.
- Accepted exceptions must be recorded in a PR comment titled `TEST GAP ACCEPTED` with reviewer, coordinator, exact risk, and why no better test exists.
- Guy is asked only when accepting the gap changes product, data, public-site, cost, or operational risk.

## Required Checks By Area

Forum/scraper modules:

- Run relevant unit/integration tests when present.
- Run `npm run status` for the touched module when useful.
- Add fixture/sample-input tests for parser or extraction changes where practical.
- Do not read large `processed_mds/`, `logs/`, or `node_modules/` unless explicitly needed.

Daily summary / production site / GitHub Pages:

- Run package tests when present.
- Run `npm run prod-check` from `kruse-summary/` when touching:
  - `kruse-summary/`
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
- Reviewer should still check that docs do not conflict with `AGENTS.md`, `AI_WORKFLOW.md`, and `ARCHITECTURE.md`.

## Reviewer Checklist

Reviewer should check:

- Does the PR match the linked issue?
- Are there unrelated file changes?
- Is the branch named for the issue with the repo's task prefixes, such as `feat/issue-<number>-<short-slug>`, `fix/issue-<number>-<short-slug>`, or `docs/issue-<number>-<short-slug>`?
- Does `TASK_ID` match the branch issue number?
- Is there a worker lease comment link?
- Are tests meaningful for the changed behavior?
- Would at least one focused test, fixture, smoke path, integration path, or documented manual check fail or reveal the problem if the worker's change were absent or broken?
- Did the worker add unit and integration/smoke coverage where reasonable?
- If tests are missing, is the exception acceptable?
- If tests are missing, is there a `TEST GAP ACCEPTED` PR comment?
- Did required local checks pass?
- Are external-impact boundaries respected?
- Is deployment impact correctly stated?
- Are docs updated if workflow, commands, or user-facing behavior changed?
- Is the PR small enough to review safely?
- Is there an independent reviewer pass?
- Was the `review-fix/pr-<number>-<short-scope>` lane created by the
  implementation worker as part of PR opening, verified with a real Codex
  thread id and exact stored title, and written back to PR/Project status
  rather than left as requested/pending/coordinator work?
- Are post-review fixes and merge owned by the `review-fix/` quality lane or an explicitly named replacement owner?
- Did the review-fix lane fix every safe finding directly on the PR branch, or explain why each remaining issue was unsafe to fix?
- If any required check failed, did the review-fix lane classify it as PR-related, already present on `origin/main`, or unproven before handing off?
- Are issue/project status and links updated?

## Ready To Merge

A PR is ready to merge only when:

- Linked issue acceptance criteria are met.
- `TASK_ID` is present and matches the branch issue number.
- Worker lease comment is linked.
- `review-fix/pr-<number>-<short-scope>` lane is linked with real Codex thread
  id and exact stored title, or an explicit reviewer-handoff blocker is linked.
- Post-review fix owner and merge owner are named.
- Required tests/checks pass or documented exceptions are accepted by reviewer/coordinator in a `TEST GAP ACCEPTED` PR comment.
- Verification evidence names the specific changed behavior that was exercised.
- Local PR guard passes. While the GitHub Actions pause is active, `PR Ops Guard` Action status is not required.
- Reviewer or coordinator is satisfied.
- Any remaining review-fix blocker names why the lane could not safely fix it itself and who owns the next action.
- No unresolved external-impact approval remains.
- No `hold:guy` or `hold:coordinator` label remains.
- No unrelated dirty-root changes are included.
- Public-site/GitHub Pages changes passed `npm run prod-check` from `kruse-summary/`, or no public-site/GitHub Pages code/config changed.

The `review-fix/` quality lane should merge once ready unless Guy or the coordinator has put a hold on it. Reviewer-only lanes verify and state pass/fail; they do not become the default fix or merge owner.
