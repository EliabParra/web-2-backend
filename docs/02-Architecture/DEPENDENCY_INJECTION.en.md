# Dependency Injection & Lazy Loading

Technical explanation of how the framework manages Business Object dependencies.

## Dependency Architecture

### `IContainer` Core

The framework uses a centralized **Inversion of Control (IoC)** container to manage dependencies. Instead of strict property injection, all Business Objects and Services receive the `IContainer`.

```typescript
// src/types/core.ts
export interface IContainer {
    resolve<T>(key: string): T
    register<T>(key: string, instance: T): void
    registerFactory<T>(key: string, factory: (c: IContainer) => T): void
    has(key: string): boolean
}
```

### `BaseBO` Base Class

Business Objects extend `BaseBO`, which receives the container and strictly resolves core dependencies:

```typescript
// src/core/business-objects/BaseBO.ts
export class BaseBO {
    protected readonly db: IDatabase
    protected readonly log: ILogger
    protected readonly config: IConfig
    protected readonly container: IContainer
    // ... other dependencies (i18n, validator) can be resolved on demand

    constructor(container: IContainer) {
        this.container = container
        this.db = container.resolve<IDatabase>('db')
        this.log = container.resolve<ILogger>('log')
        this.config = container.resolve<IConfig>('config')
        // ...
    }
}
```

## Injection Flow & Module Registration

The framework supports a **Self-Registration Pattern** where each functional module is responsible for registering its own services into the container.

```
┌──────────────┐     ┌───────────┐     ┌───────────────────────┐
│  foundation  │────▶│ AppServer │────▶│ TransactionController │
│ (Auth/Cont.) │     │  (setup)  │     │       (HTTP)          │
└──────────────┘     └───────────┘     └───────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────┐     ┌────────────────────┐
│  TransactionExecutor  │◀────│   SecurityService  │
│    (dynamic import)   │     │    (orchestrate)   │
└───────────────────────┘     └────────────────────┘
            │
            ▼
  ┌─────────────────────┐       ┌────────────────────┐
  │   Business Object   │──────▶│   Module Factory   │
  │    (IContainer)     │       │ (registerService)  │
  └─────────────────────┘       └────────────────────┘
```

1. **foundation.ts**: Creates the root `IContainer` with core services (`db`, `log`, `security`).
2. **TransactionExecutor**: Dynamically imports the BO class.
3. **Business Object**: Instantiated with `new BO(container)`.
4. **Self-Registration**: The BO constructor calls its module's registration function (e.g., `registerProducts(container)`).
5. **Service Resolution**: The BO resolves its specific service (e.g., `container.resolve('ProductService')`).

## Lazy Loading

Business Objects are loaded on-demand to optimize startup time.

### Implementation (`TransactionExecutor.ts`)

```typescript
async execute(objectName: string, methodName: string, params: unknown) {
    // 1. Build module path
    const modulePath = `../../BO/${objectName}/${objectName}BO.js`

    // 2. Dynamic import (only when needed)
    const module = await import(modulePath)
    const BOClass = module[`${objectName}BO`]

    // 3. Instantiate with container
    // The container is injected into the Executor during AppServer setup
    const instance = new BOClass(this.container)

    // 4. Execute method
    return instance[methodName](params)
}
```

## Advantages

| Feature            | Benefit                                               |
| ------------------ | ----------------------------------------------------- |
| **Loose Coupling** | BOs don't need to know how to create their deps.      |
| **Testability**    | Easy mocking of the entire `IContainer`.              |
| **Modularity**     | Modules register themselves; zero config in AppServer |
| **Isolation**      | Error in one BO doesn't affect others until invoked.  |

## See Also

- [Bootstrap](./BOOTSTRAP.en.md) - Initialization process
- [AppServer Core](./APPSERVER_CORE.en.md) - HTTP server functionality
- [Security System](./SECURITY_SYSTEM.en.md) - Permissions and transactions
