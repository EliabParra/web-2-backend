# Testing Guide

## Framework

We use the native **Node.js Test Runner** (`node:test`) with `tsx` for TypeScript execution. No Jest or Vitest.

## Directory Structure

```
test/
├── setup.ts                        # Bootstrap (env vars)
├── _helpers/
│   ├── test-utils.ts               # Mock factories (container, logger, db, i18n, email)
│   ├── mock-container.ts           # IContainer mock implementing DI
│   └── global-state.ts             # Global state isolation utilities
├── __fixtures__/
│   └── auth.fixtures.ts            # Centralized test data for Auth
├── bo/
│   └── Auth/
│       ├── AuthBO.test.ts          # Unit tests for AuthBO
│       └── AuthService.test.ts     # Unit tests for AuthService
└── integration/
    └── auth.http.test.ts           # HTTP integration tests
```

## Conventions

### Naming

- Files: `[Module].test.ts`
- Tests: `should [expected behavior] when [state/condition]`

### Pattern: AAA (Arrange, Act, Assert)

```typescript
it('should return 201 when registration data is valid', async () => {
    // Arrange
    const params = { ...VALID_REGISTER_INPUT }

    // Act
    const result = await bo.register(params)

    // Assert
    assert.equal(result.code, 201)
})
```

### Rules

- **No `any`** — use `Partial<T>`, `Record<string, unknown>`, or custom interfaces
- **No magic strings** — centralize test data in `test/__fixtures__/`
- **No real I/O** — mock `db`, `email`, `i18n` via `createTestContainer()`
- **TypeDoc in Spanish** — all test helpers must have TSDoc comments

## Writing a Unit Test

### 1. Import utilities

```typescript
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createTestContainer, createMockFn } from '../../_helpers/test-utils.js'
```

### 2. Create mock dependencies

```typescript
function createBOWithMocks() {
    const service = {
        myMethod: createMockFn(async () => expectedResult),
    }
    const container = createTestContainer({ MyService: service })
    return { bo: new MyBO(container), service }
}
```

### 3. Write tests with AAA

```typescript
describe('MyBO', () => {
    let bo: MyBO
    let service: MockService

    beforeEach(() => {
        const mocks = createBOWithMocks()
        bo = mocks.bo
        service = mocks.service
    })

    it('should succeed when input is valid', async () => {
        // Arrange
        const params = { ...VALID_INPUT }

        // Act
        const result = await bo.myMethod(params)

        // Assert
        assert.equal(result.code, 200)
        assert.equal(service.myMethod.callCount, 1)
    })
})
```

## Key Utilities

| Utility                          | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `createTestContainer(overrides)` | Creates `IContainer` with all standard mocks pre-registered |
| `silentLogger()`                 | Logger that produces no output                              |
| `mockConfig(overrides)`          | Full `IAppConfig` with test defaults                        |
| `mockI18n()`                     | I18n stub returning keys as-is                              |
| `mockEmail()`                    | Email stub resolving without sending                        |
| `mockDb(rows)`                   | Database stub returning specified rows                      |
| `zodValidator()`                 | Validator using real Zod `safeParse`                        |
| `createMockFn(impl)`             | Function with call tracking (`.calls`, `.callCount`)        |

## Commands

| Command                                                                         | Description                       |
| ------------------------------------------------------------------------------- | --------------------------------- |
| `pnpm test`                                                                     | Run all tests                     |
| `pnpm run test:watch`                                                           | Watch mode                        |
| `pnpm run test:coverage`                                                        | With c8 coverage report           |
| `pnpm run verify`                                                               | Typecheck + build + smoke + tests |
| `node --import tsx --import ./test/setup.ts --test test/bo/Auth/AuthBO.test.ts` | Single file                       |
