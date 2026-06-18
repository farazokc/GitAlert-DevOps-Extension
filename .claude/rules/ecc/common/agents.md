# Agent Orchestration

## Available Agents

Located in `.claude/agents/` (project-level, tracked in git):

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| harness-specialist | Claude Code harness configuration | Hooks, settings, permissions, agents, skills, MCP, CLAUDE.md, memory, context |
| security-reviewer | Security analysis | Before commits; auth, token handling, storage, API calls |
| build-error-resolver | Fix build errors | When `npm run test` or linting fails |
| performance-optimizer | Performance profiling | Service worker memory/CPU, alarm handlers, API polling |

## Immediate Agent Usage

No user prompt needed:
1. Complex feature requests - Use **planner** agent
2. Code just written/modified - Use **code-reviewer** agent
3. Bug fix or new feature - Use **tdd-guide** agent
4. Architectural decision - Use **architect** agent

## Parallel Task Execution

ALWAYS use parallel Task execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker
