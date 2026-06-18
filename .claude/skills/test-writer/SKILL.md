---
name: test-writer
description: Generate comprehensive tests for JavaScript functions following AAA pattern. Use when asked to write tests for a module or function. Note: this project uses Node's built-in --test runner (not Vitest), so use node:test and node:assert instead of vitest imports.
---

# Test Writer

Generate comprehensive tests for JavaScript code following project conventions.

## Project Test Runner

This project uses **Node's built-in test runner** (`node --test`), not Vitest.

```javascript
// Correct imports for this project
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Run: node --test test/azure.test.mjs
```

## Test Writing Phases

### Phase 1: Identify Testable Units

Scan the module for:
- Pure functions with deterministic output (highest priority)
- Functions with clear inputs/outputs
- Error conditions and edge cases
- Async functions

Skip or mock:
- Chrome extension APIs (`chrome.*`)
- Network calls (`fetch`)
- `chrome.storage.local` (stub with a plain object)

### Phase 2: Structure Tests (AAA Pattern)

```javascript
describe("functionName", () => {
  it("should [behavior] when [condition]", () => {
    // Arrange
    const input = ...;

    // Act
    const result = functionName(input);

    // Assert
    assert.strictEqual(result, expected);
  });
});
```

### Phase 3: Handle Special Cases

| Case | Solution |
|------|----------|
| Chrome APIs | Pass stubs as arguments or use a minimal mock object |
| Async functions | `async` test + `await`, assert throws with `assert.rejects` |
| Error conditions | `assert.throws(() => fn(), /message/)` |
| Object equality | `assert.deepStrictEqual(result, expected)` |

## Test Patterns

### Basic assertion
```javascript
it("should return the correct value", () => {
  assert.strictEqual(add(1, 2), 3);
});
```

### Error testing
```javascript
it("should throw when input is invalid", () => {
  assert.throws(() => parseToken(null), /invalid token/i);
});
```

### Async testing
```javascript
it("should resolve with data", async () => {
  const result = await fetchData(mockFetch, "org", "project");
  assert.deepStrictEqual(result, { id: 1 });
});
```

### Grouping with describe
```javascript
describe("classifyPR", () => {
  describe("when assigned to current user", () => {
    it("should return 'assigned'", () => { ... });
  });

  describe("when authored by current user", () => {
    it("should return 'mine'", () => { ... });
  });
});
```

## Test Naming

- Start with "should"
- Describe the behavior, not the implementation
- Include the condition: "should X when Y"

```javascript
// Good
it("should return empty array when no repos match", () => {});
it("should throw when PAT is missing", () => {});
it("should retry up to 3 times on network failure", () => {});

// Bad
it("test fetch", () => {});
it("works", () => {});
```

## Running Tests

```bash
# Run all tests
node --test

# Run single file
node --test test/azure.test.mjs

# Run with verbose output
node --test --reporter=spec test/azure.test.mjs
```

## Quality Checklist

- [ ] Each public function has at least one test
- [ ] Happy path covered
- [ ] Error/edge cases covered
- [ ] No tests depend on Chrome extension APIs without stubbing
- [ ] Tests are isolated (no shared mutable state between tests)
- [ ] All tests pass: `node --test`
