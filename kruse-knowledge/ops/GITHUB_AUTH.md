# GitHub CLI Auth

This repo uses `gh` for issues, PRs, labels, workflows, and GitHub Projects.

## Codex Token Problem

In Codex desktop threads, `gh` may be a Codex shim, or it may be the real
GitHub CLI running with `GH_TOKEN`/`GITHUB_TOKEN` injected into the process:

```text
C:\Users\<user>\.codex\tmp\...\gh.cmd
C:\Users\<user>\AppData\Local\OpenAI\Codex\bin\...\gh.cmd
C:\Users\<user>\AppData\Local\Programs\GitHub CLI\bin\gh.exe
```

Those token paths can expose only a limited token even when ordinary git
commands can still push through Git Credential Manager.

Symptoms:

- `gh auth status` says the login source is `(GH_TOKEN)`.
- Token scopes show `gist`, `repo`, and `workflow`.
- Issue, PR, label, and workflow commands work.
- `gh project ...` fails with missing scopes such as `read:project read:org read:discussion`.
- `gh auth refresh ...` says it cannot refresh while `GH_TOKEN` is used.

Do not keep retrying Project commands in this state. It is an auth-scope blocker, not a workflow-design problem.

For the full diagnosis, run:

```powershell
tools/ensure-gh-auth.ps1 -RequireProject
```

When `GH_TOKEN` is the active auth source, the preflight also checks whether a
stored `gh` login exists after removing token env vars, and whether the Git
Credential Manager token has broader scopes. It never prints token values.

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
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
gh auth login --hostname github.com --web --git-protocol https --scopes repo,workflow,read:org,read:project,project,read:discussion
tools/ensure-gh-auth.ps1 -RequireProject
```

If the preflight still reports `(GH_TOKEN)`, the command is still running
through a limited environment token. If it reports the Git Credential Manager
token with only `gist, repo, workflow`, Git operations are using the same
limited token and Project sync must stay blocked until auth is refreshed.
