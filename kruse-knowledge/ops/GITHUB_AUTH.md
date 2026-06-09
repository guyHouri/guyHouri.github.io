# GitHub CLI Auth

This repo uses `gh` for issues, PRs, labels, workflows, and GitHub Projects.

## Codex Shim Problem

In Codex desktop threads, `gh` may be a Codex shim, not a normal GitHub CLI login:

```text
C:\Users\<user>\.codex\tmp\...\gh.cmd
C:\Users\<user>\AppData\Local\OpenAI\Codex\bin\...\gh.cmd
```

That shim can inject a limited `GH_TOKEN` even when `$env:GH_TOKEN` is empty.

Symptoms:

- `gh auth status` says the login source is `(GH_TOKEN)`.
- Token scopes show `gist`, `repo`, and `workflow`.
- Issue, PR, label, and workflow commands work.
- `gh project ...` fails with missing scopes such as `read:project read:org read:discussion`.
- `gh auth refresh ...` says it cannot refresh while `GH_TOKEN` is used.

Do not keep retrying Project commands in this state. It is an auth-scope blocker, not a workflow-design problem.

## Required Preflight

Before any GitHub Project mutation, run:

```powershell
tools/ensure-gh-auth.ps1 -RequireProject
```

This must pass before using:

```powershell
tools/sync-github-project-fields.ps1 -ProjectNumber <number>
```

## Durable Repair

Use one of these repairs:

1. Update the Codex/GitHub connector token to include:
   `repo, workflow, read:org, read:project, project, read:discussion`.
2. Or use a normal terminal/real GitHub CLI where Codex does not inject `GH_TOKEN`:

```powershell
Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
gh auth login --hostname github.com --web --git-protocol https --scopes repo,workflow,read:org,read:project,project,read:discussion
tools/ensure-gh-auth.ps1 -RequireProject
```

If the preflight still reports `(GH_TOKEN)` from a Codex shim, the command is still running through the limited Codex token.
