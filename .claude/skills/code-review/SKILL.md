---
name: code-review
description: Mandatory code reviews via /code-review before commits and deploys
when-to-use: When user asks to review code, before commits, or when /code-review is invoked
user-invocable: true
allowed-tools: [Read, Glob, Grep, Bash]
effort: high
---

# Code Review Skill

**Purpose:** Enforce automated code reviews as a mandatory guardrail before every commit and deployment.

## When to Run Code Review

### Mandatory Review Points

| Trigger | Action |
|---------|--------|
| **Before commit** | Review staged changes |
| **Before PR** | Review all changes vs base |
| **Before merge** | Final review of PR |
| **Before deploy** | Review deployment diff |

## Review Categories

| Category | What It Checks |
|----------|----------------|
| **Security** | Vulnerabilities, injection risks, auth issues, secrets |
| **Performance** | N+1 queries, memory leaks, inefficient algorithms |
| **Architecture** | Design patterns, SOLID principles, coupling |
| **Code Quality** | Readability, complexity, duplication |
| **Best Practices** | Language idioms, framework conventions |
| **Testing** | Coverage gaps, test quality, edge cases |
| **Documentation** | Missing docs, outdated comments |

## Severity Levels

| Level | Action Required | Can Commit? |
|-------|-----------------|-------------|
| 🔴 **Critical** | Must fix immediately | ❌ NO |
| 🟠 **High** | Should fix before commit | ❌ NO |
| 🟡 **Medium** | Fix soon, can commit | ✅ YES |
| 🟢 **Low** | Nice to have | ✅ YES |
| ℹ️ **Info** | Suggestions only | ✅ YES |

## Review Response Template

```markdown
## Code Review Results

### 🔴 Critical Issues (Must Fix)
1. **[Issue] in [file]:[line]**
   - Issue: [description]
   - Fix: [how to fix]

### 🟠 High Issues (Should Fix)
...

### 🟡 Medium Issues (Fix Soon)
...

### ✅ Strengths
- [what's good]

### 📊 Summary
- Critical: X | High: X | Medium: X | Low: X
- **Status: ❌ BLOCKED** / **✅ APPROVED**
```

## Common Security Issues (Always Fix)

| Issue | Example | Fix |
|-------|---------|-----|
| XSS | `innerHTML = userInput` | Sanitize or use textContent |
| Secrets in code | `apiKey = "sk-xxx"` | Use environment variables |
| Missing auth | Unprotected endpoints | Add authentication middleware |

## Common Performance Issues (Should Fix)

| Issue | Fix |
|-------|-----|
| Memory leak | Close connections/listeners |
| Unbounded loops | Add constraints |
| Missing caching | Cache expensive operations |

## Workflow

```
Code → Test → Review → Fix → Commit → Push → PR → Review → Merge
              ↑                              ↑
           /code-review                /code-review
```
