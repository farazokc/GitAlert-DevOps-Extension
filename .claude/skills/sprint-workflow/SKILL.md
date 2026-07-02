---
name: sprint-workflow
description: "Sprint implementation workflow. Invoke at the start of any feature or bugfix sprint task. Walks through plan mode, TDD red-green-refactor, code review, security review, and lint in the correct mandatory order. Orchestrates the existing tdd-guide, code-reviewer, and security-reviewer agents."
compatibility: claude-code-only
---

# Sprint Workflow

Invoke `/sprint` at the start of every feature or bugfix task. Do not write any code before completing Step 0.

---

## Step 0 — Branch (before touching any file)

Check the current branch. If on `main` (or any non-feature branch), create a feature branch now:

```bash
git checkout main && git pull origin main
git checkout -b feature/<kebab-case-description>
```

Name the branch from the sprint/task description. Examples:
- `feature/sprint-3-urgent-pr-support`
- `feature/sprint-4-reminder-controls`

**Never implement on `main`.** If already on a feature branch, skip this step.

---

## Step 1 — Plan (before touching any file)

Use the `Plan` subagent or enter plan mode to align with the user before implementation:

- Identify which files will change
- Identify whether any changes touch auth, PAT tokens, `chrome.storage`, or Azure DevOps API calls — **flag these for security review in Step 7**
- Break the task into discrete implementation phases
- Create tasks with `TaskCreate` for each phase — mark them `in_progress` when started and `completed` when done

Do not exit plan mode until the user approves the plan.

---

## Step 2 — TDD Red phase (tests first, always)

Invoke `Skill("test-driven-development")` to load the TDD iron laws into context.

Invoke `Skill("test-writer")` to generate test stubs for the target functions.

For each new function or behavior:

1. Write one test describing the expected behavior in `test/`
2. Run `node --test` — confirm the test **fails** for the right reason
3. If it passes immediately, the test is wrong — fix it or delete it and start over

**Never proceed to Step 3 until you have watched every new test fail.**

---

## Step 3 — Green phase (minimal implementation)

Write the minimum production code needed to make the failing tests pass.

Run `node --test` — confirm **all** tests pass.

If tests fail: fix the implementation, not the test. Repeat Steps 2–3 for each function.

---

## Step 4 — Refactor

Remove duplication, improve names, extract helpers. Do not add new behavior here.

Run `node --test` after every change. If anything goes red, revert and try again.

---

## Step 5 — Code review (mandatory after every source file change)

Invoke the `code-reviewer` agent on all changed source files:

```
Agent(subagent_type="code-reviewer", prompt="Review the following changed files: ...")
```

Address all CRITICAL and HIGH findings before continuing. Fix MEDIUM findings where possible.

---

## Step 6 — Security review (conditional)

**Required if Step 1 flagged any files.** `api.js` always qualifies. Any file touching `chrome.storage`, PAT tokens, `buildBasicAuthHeader`, `withRetry`, or Azure DevOps API URLs also qualifies.

Invoke the `security-reviewer` agent:

```
Agent(subagent_type="security-reviewer", prompt="Review the following changed files for security issues: ...")
```

Address all CRITICAL findings before marking work done.

---

## Step 7 — Lint (automated at session end)

The Stop hook runs `npx eslint . && npx prettier --check .` automatically. Run manually at any point to check:

```bash
npx eslint .
```

Must be clean before the sprint task is marked complete.

---

## Step 8 — Create PR

Once lint is clean and all tasks are marked completed, push the branch and open a PR:

```bash
git push -u origin <branch-name>
gh pr create --title "<conventional-commit-title>" --body "$(cat <<'EOF'
## Summary
- <bullet point summary of what changed>

## Test plan
- [ ] `node --test` passes (N tests)
- [ ] `npx eslint .` clean
- [ ] Manual verification in browser (describe what was checked)

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

Return the PR URL to the user.

---

## Completion gate

Before marking any sprint task done:

- [ ] On a feature branch (not `main`)
- [ ] Every new function has a test that was **watched to fail** before implementation
- [ ] All tests pass: `node --test`
- [ ] `code-reviewer` agent was invoked
- [ ] `security-reviewer` agent was invoked (if auth/API/storage touched)
- [ ] `npx eslint .` is clean
- [ ] All `TaskCreate` tasks are marked `completed`
- [ ] PR created and URL provided to user

---

## Reference — what each agent/skill does

| Invocation | When | Purpose |
|---|---|---|
| `Skill("test-driven-development")` | Step 2 | TDD iron laws, red-green-refactor cycle |
| `Skill("test-writer")` | Step 2 | Test stubs in `node:test` format for this project |
| `Agent(code-reviewer)` | Step 5 | Correctness, conventions, module system, style |
| `Agent(security-reviewer)` | Step 6 | PAT handling, storage access, API calls, CSP |
| `gh pr create` | Step 8 | Open PR for the feature branch |

The Stop hook already covers lint (Step 7) automatically — do not duplicate it.
