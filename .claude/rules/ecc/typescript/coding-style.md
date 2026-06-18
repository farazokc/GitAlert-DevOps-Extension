---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Coding Style

> Extends [common/coding-style.md](../common/coding-style.md)

## Types and Interfaces

- Explicit typing for public APIs; inference is fine for local variables
- Use `interface` for extensible object shapes
- Use `type` aliases for unions and utility types
- Prefer string literal unions over enums

## Error Handling

Use `async/await` with `try-catch` and narrow unknown errors safely:

```typescript
try {
  await doSomething()
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message)
  }
}
```

## Immutability

Use spread operators rather than direct mutation:

```typescript
// NEVER
obj.prop = newValue

// ALWAYS
const updated = { ...obj, prop: newValue }
```

## Input Validation

Use Zod for schema-based validation with type inference:

```typescript
import { z } from 'zod'
const schema = z.object({ token: z.string().min(1) })
const data = schema.parse(input)
```

## React Components

- Props should use named interfaces or types
- Explicit callback typing
- Avoid `React.FC` unless necessary

## Logging

- NEVER use `console.log` in production code
- Use a proper logging library
