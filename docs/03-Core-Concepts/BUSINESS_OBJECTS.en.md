# Business Objects (BO): Business Anatomy

The Business Object (BO) is the supreme class in our architecture. It is where your code "does things".

## Anatomy of a BO

Every BO must inherit from `BaseBO`. It receives the `IContainer` to verify dependencies and standardizes execution.

```typescript
import { BaseBO, ApiResponse, IContainer } from '../../src/core/business-objects/index.js'
import {
    UserService,
    UserMessages,
    UserSchemas, // Now exported as object
    Inputs, // New Inputs namespace
    Types, // New Types namespace
    registerUser, // DI Registration function
} from './UserModule.js'

export class UserBO extends BaseBO {
    private service: UserService

    constructor(container: IContainer) {
        super(container)
        registerUser(container) // Self-register dependencies
        this.service = container.resolve<UserService>('UserService')
    }

    // Typed accessors for i18n
    private get userMessages() {
        return this.i18n.use(UserMessages)
    }

    // Standard Method
    async create(params: Inputs.CreateInput): Promise<ApiResponse> {
        return this.exec<Inputs.CreateInput, Types.User>(
            params,
            UserSchemas.create,
            async (data) => {
                const user = await this.service.create(data)
                return this.created(user, this.userMessages.createSuccess)
            }
        )
    }
}
```

## The `.exec()` Pattern

Instead of writing repetitive `try/catch` and `validate` blocks, use `this.exec()`.

**Handles for you**:

1. **Validation**: verifies `params` against Zod schema. Returns 400 if invalid.
2. **Execution**: Runs your callback function.
3. **Error Handling**: Captures errors, checks if they are `BOError` and returns appropriate 4xx/500 codes.

## Injected Tools

Inside a BO, you have access to core tools via protected properties (resolved from `IContainer` by `BaseBO`):

| Property         | Type           | Description                   |
| :--------------- | :------------- | :---------------------------- |
| `this.db`        | `IDatabase`    | Direct access to Postgres.    |
| `this.log`       | `ILogger`      | Structured logger.            |
| `this.config`    | `IConfig`      | Typed environment variables.  |
| `this.i18n`      | `II18nService` | Internationalization service. |
| `this.validator` | `IValidator`   | Validation service (Zod).     |
| `this.container` | `IContainer`   | The IoC container itself.     |

## 9-File Structure

Each BO generates **9 files** with the nomenclature `{Name}{Type}.ts`:

```
BO/User/
├── 📦 UserBO.ts            # Business Object (main file)
├── 🧠 UserService.ts       # Business Logic
├── 🗄️ UserRepository.ts    # Database Access
├── 🔍 UserQueries.ts       # Colocated SQL
├── ✅ UserSchemas.ts        # Zod Validations
├── 📘 UserTypes.ts          # TypeScript Types (Entity, Input)
├── 💬 UserMessages.ts       # I18n strings (ES/EN)
├── ❌ UserErrors.ts         # Custom Error Classes
└── 📦 UserModule.ts         # Module REGISTRATION & exports
```

## Services and Repositories

To keep code clean:

- **BO**: Orchestrates (HTTP -> BO -> Service).
- **Service**: Extends `BOService`. Contains pure business logic.
- **Repository**: Uses `db.query<T>` with types and colocated SQL.

```typescript
// Repository
import { IDatabase } from '../../src/core/business-objects/index.js'
import { UserQueries, Types } from './UserModule.js'

export class UserRepository implements Types.IUserRepository {
    constructor(private db: IDatabase) {}

    async findById(id: number): Promise<Types.User | null> {
        // Types.User is a type alias, compatible with Record<string, unknown>
        const result = await this.db.query<Types.User>(UserQueries.findById, [id])
        return result.rows[0] ?? null
    }
}
```

```typescript
// Service
import { BOService, IContainer } from '../../src/core/business-objects/index.js'
import { Errors, Types, UserRepository } from './UserModule.js'

export class UserService extends BOService implements Types.IUserService {
    private repo: UserRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<UserRepository>('UserRepository')
    }

    async create(data: Types.CreateUserInput) {
        if (await this.repo.exists(data.email)) {
            throw new Errors.UserAlreadyExistsError(data.email)
        }
        // ... logic
    }
}
```
