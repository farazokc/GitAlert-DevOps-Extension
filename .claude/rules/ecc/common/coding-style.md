# Coding Style Guide

## Core Principles

- **KISS** - Prioritize simplicity and clarity over clever implementations
- **DRY** - Extract repeated logic into shared utilities rather than duplicating code
- **YAGNI** - Build only features that are currently needed, avoiding speculative abstractions
- **Immutability** - ALWAYS create new objects, NEVER mutate existing ones

## File Organization

- MANY SMALL FILES > FEW LARGE FILES
- Files: 200-400 lines preferred, 800-line maximum
- Organize by feature or domain, not by type

## Naming Conventions

- `camelCase` for variables and functions
- `PascalCase` for types and classes
- `UPPER_SNAKE_CASE` for constants

## Critical Practices

- Comprehensive error handling at all system levels
- Input validation at all boundaries using schema-based approaches
- Eliminate deep nesting — use early returns
- No magic numbers — use named constants
- Functions focused to <50 lines

## Completion Checklist

- [ ] Code is readable and well-named
- [ ] Functions are focused (<50 lines)
- [ ] File is cohesive (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Errors handled explicitly
- [ ] Immutable patterns used (no direct mutation)
