# PR Testing And Review

This document defines the minimum checks expected before a PR is ready to merge.

## Every PR

Every PR should include:

- `TASK_ID: #<issue-number>`.
- Linked issue.
- Clear task scope.
- Summary of changes.
- Unit tests added or updated for new logic.
- Integration, smoke, or end-to-end checks when the code crosses module boundaries.
- Exact commands run.
- Known test gaps.
- Risk notes.
- External-impact and deployment impact.
- Reviewer assignment, `review-fix/pr-<number>-<short-scope>` lane link, or explicit reviewer-handoff blocker.
- Post-review fix owner and merge owner.
- Worker lease comment link.

Do not mark a PR ready if the worker did not run tests and did not explain why.
Do not leave a draft PR sitting at "needs review." The worker must create the combined `review-fix/pr-<number>-<short-scope>` lane after the PR exists, link it in the PR or issue status, or write the exact reviewer-handoff blocker.
Do not leave post-review ownership implicit. The combined `review-fix/pr-<number>-<short-scope>` lane owns review, safe fixes on the PR branch, check reruns, ready/merge, and cleanup unless it reports a concrete blocker.

## Worker Test Responsibility

When a worker adds code, the worker is responsible for adding or updating tests for that code.

Expected pattern:

- Pure functions: unit tests.
- Parsers/scrapers: fixture or sample-input tests where practical.
- CLI or pipeline behavior: integration or smoke test.
- UI/report rendering: build plus visual or DOM interaction smoke check.
- Production website/report changes: `npm run prod-check` from `kruse-summary/`.

If there is no existing test harness, the worker should add the smallest reasonable test harness or document why that is out of scope and what manual verification was done.

A worker cannot waive its own missing tests. Missing-test handling:

- Worker documents the gap and the reason.
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
- Is the branch named for the issue, preferably `codex/issue-<number>-<short-slug>`?
- Does `TASK_ID` match the branch issue number?
- Is there a worker lease comment link?
- Are tests meaningful for the changed behavior?
- Did the worker add unit and integration/smoke coverage where reasonable?
- If tests are missing, is the exception acceptable?
- If tests are missing, is there a `TEST GAP ACCEPTED` PR comment?
- Did required checks pass?
- Are external-impact boundaries respected?
- Is deployment impact correctly stated?
- Are docs updated if workflow, commands, or user-facing behavior changed?
- Is the PR small enough to review safely?
- Is there an independent reviewer pass?
- Was the `review-fix/pr-<number>-<short-scope>` lane opened by the implementation worker or coordinator, rather than left as an unowned future action?
- Are post-review fixes and merge owned by the `review-fix/` quality lane or an explicitly named replacement owner?
- Are issue/project status and links updated?

## Ready To Merge

A PR is ready to merge only when:

- Linked issue acceptance criteria are met.
- `TASK_ID` is present and matches the branch issue number.
- Worker lease comment is linked.
- `review-fix/pr-<number>-<short-scope>` lane, human reviewer, explicit reviewer pass, or exact reviewer-handoff blocker is linked.
- Post-review fix owner and merge owner are named.
- Required tests/checks pass or documented exceptions are accepted by reviewer/coordinator in a `TEST GAP ACCEPTED` PR comment.
- `PR Ops Guard` passes.
- Reviewer or coordinator is satisfied.
- No unresolved external-impact approval remains.
- No `hold:guy` or `hold:coordinator` label remains.
- No unrelated dirty-root changes are included.
- Public-site/GitHub Pages changes passed `npm run prod-check` from `kruse-summary/`, or no public-site/GitHub Pages code/config changed.

The `review-fix/` quality lane should merge once ready unless Guy or the coordinator has put a hold on it. Reviewer-only lanes verify and state pass/fail; they do not become the default fix or merge owner.
