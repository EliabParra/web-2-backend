# Toproc AI Agent Context & Specifications

This document (`AGENT.md`) serves as the master context and specification guide for any AI agent interacting with the **Toproc (ToProccess core)** repository.

## 1. Project Overview & Philosophy

- **Name**: Toproc
- **Architecture**: Transaction-Oriented secure dispatch backend.
- **Philosophy**:
    - **"Zero-Magic"**: Explicit structure over implicit magic.
    - **Security by Design**: Deny by Default. If a transaction isn't mapped in the DB, it does not exist.
    - **Granular Audit**: Full traceability on who, when, and with what parameters an action was attempted.

## 2. Technology Stack

- **Environment**: Node.js 20+ (ESM Modules enabled `type: "module"`).
- **Framework**: Express 5.x.
- **Language**: TypeScript (Strict Mode enabled).
- **Database**: PostgreSQL 14+ (using `pg` driver and `connect-pg-simple` for sessions).
- **Validation**: Zod (deeply integrated).
- **Testing**: Native Node.js Test Runner (`node --test`) + `c8` for coverage.
- **Tooling**: `tsx` (TypeScript execution), `pnpm` (package manager), Docker/Docker Compose.

## 3. Core Architecture

Unlike traditional MVC apps with REST endpoints, Toproc routes all business logic through a **single entry point**.

### **The Single Entry Point**

- **Route**: `POST /toProccess`
- **Payload Structure**: `{ "tx": 1001, "params": { ... } }`
- **Flow**: `HTTP -> AppServer -> TransactionController -> TransactionOrchestrator -> Authorization -> TransactionExecutor -> Business Object (BO)`.

### **Business Objects (BOs)**

All business rules live in the `BO/` directory. Each BO uses a strict **9-file structure**:

1. `*BO.ts`: The Controller layer (inherits from `BaseBO`).
2. `*Service.ts`: Pure business logic (inherits from `BOService`).
3. `*Repository.ts`: Database access logic.
4. `*Queries.ts`: Colocated raw SQL queries.
5. `*Schemas.ts`: Zod validation schemas.
6. `*Types.ts`: TypeScript interfaces and types (inferred from Zod where possible).
7. `*Messages.ts`: i18n translation strings (EN/ES).
8. `*Errors.ts`: Custom domain errors.
9. `*Module.ts`: Dependency Injection registration and namespace exports.

### **The `.exec()` Pattern**

In a BO, methods must wrap logic using `this.exec()` provided by `BaseBO`. It automatically handles:

- **Validation**: Validates input params against a Zod schema.
- **Execution**: Runs the callback if valid.
- **Error Handling**: Catches standard errors (`BOError`) and HTTP formatting.

Example:

```typescript
async create(params: Inputs.CreateInput): Promise<ApiResponse> {
    return this.exec<Inputs.CreateInput, Types.User>(
        params,
        UserSchemas.create,
        async (data) => {
            const user = await this.service.create(data);
            return this.created(user, this.messages.success);
        }
    );
}
```

## 4. Development Guidelines & Key APIs

### **Validation & Typing**

- **Never** use `z.parse()` manually. It is abstracted by the framework.
- The Zod Schema _is_ the Type. Use `z.infer<typeof Schema>` to export types in `*Types.ts`.
- Prefer transforming inputs during validation (e.g., `z.string().transform(Number)`).

### **Data Access & Services**

- Repositories must use `this.db.query<T>(Queries.find, [args])`. Return typed objects.
- Services must orchestrate repositories, evaluate rules, and throw `BOError` classes if logic fails.
- Do **not** leak HTTP knowledge (Request/Response) into Services or Repositories.

### **Error Handling Strategy**

- Throw specific custom errors (e.g., `UserAlreadyExistsError`).
- Let the base framework catch them. The `createFinalErrorHandler` middleware will log securely (preventing secret leakage) and return a standardized JSON error to the client `{"code": 500, "msg": "..."}`.

### **Injected Dependencies**

BaseBO and BOService provide immediate access to:

- `this.db`: Database connection.
- `this.log`: Structured logging.
- `this.config`: Strongly typed environment configurations.
- `this.i18n`: Internationalization strings.
- `this.container`: The IoC Container.

## 5. Agent Custom Skills (.agent/skills/)

When modifying this repository, strictly adhere to these loaded skills constraints:

1. **clean-code**: Write pragmatic code. Be concise, direct, do not over-engineer, avoid unnecessary comments.
2. **solid**: Practice SOLID principles. Create senior-level architectures using TDD when appropriate.
3. **typescript-advanced-types**: Leverage TS capabilities like generics, utility types, and mapped types. Ensure full compile-time safety.
4. **docker-expert**: If touching infrastructure, use multi-stage builds, production-ready optimizations, and secure patterns.

## 6. CLI Tools Reference

The project includes "batteries included" scripts inside `package.json`:

- **`pnpm run dev`**: Start the dev server with hot-reload (`nodemon`).
- **`pnpm run verify`**: Quality gate (Typecheck -> Build -> Smoke Test -> Test).
- **`pnpm run db`**: Interactive CLI for syncing code to DB schema, introspecting, and seeding.
- **`pnpm run bo <cmd>`**: CLI to scaffold new BOs safely.
- **`pnpm run dx:init`**: One-command complete Docker bootstrap (DB + Adminer + Install).
