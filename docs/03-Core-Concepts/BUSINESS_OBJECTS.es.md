# Business Objects (BO): Anatomía del Negocio

El Business Object (BO) es la clase suprema en nuestra arquitectura. Es donde tu código "hace cosas".

## Anatomía de un BO

Todo BO debe heredar de `BaseBO`. Recibe el `IContainer` para verificar dependencias y estandariza la ejecución.

```typescript
import { BaseBO, ApiResponse, IContainer } from '../../src/core/business-objects/index.js'
import {
    UserService,
    UserMessages,
    UserSchemas, // Ahora exportado como objeto
    Inputs, // Nuevo namespace Inputs
    Types, // Nuevo namespace Types
    registerUser, // Función de registro DI
} from './UserModule.js'

export class UserBO extends BaseBO {
    private service: UserService

    constructor(container: IContainer) {
        super(container)
        registerUser(container) // Auto-registrar dependencias
        this.service = container.resolve<UserService>('UserService')
    }

    // Accessors tipados para i18n
    private get userMessages() {
        return this.i18n.use(UserMessages)
    }

    // Método Estándar
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

## El Patrón `.exec()`

En lugar de escribir bloques repetitivos `try/catch` y `validate`, usa `this.exec()`.

**Maneja por ti**:

1. **Validación**: Verifica `params` contra el schema Zod. Retorna 400 si es inválido.
2. **Ejecución**: Corre tu función callback.
3. **Manejo de Errores**: Captura errores, verifica si son `BOError` y devuelve los códigos 4xx/500 apropiados.

## Herramientas Inyectadas

Dentro de un BO, tienes acceso a herramientas core vía propiedades protegidas (resueltas del `IContainer` por `BaseBO`):

| Propiedad        | Tipo           | Descripción                       |
| :--------------- | :------------- | :-------------------------------- |
| `this.db`        | `IDatabase`    | Acceso directo a Postgres.        |
| `this.log`       | `ILogger`      | Logger estructurado.              |
| `this.config`    | `IConfig`      | Variables de entorno tipadas.     |
| `this.i18n`      | `II18nService` | Servicio de internacionalización. |
| `this.validator` | `IValidator`   | Servicio de validación (Zod).     |
| `this.container` | `IContainer`   | El contenedor IoC mismo.          |

## Estructura de 9 Archivos

Cada BO genera **9 archivos** con la nomenclatura `{Nombre}{Tipo}.ts`:

```
BO/User/
├── 📦 UserBO.ts            # Business Object (archivo principal)
├── 🧠 UserService.ts       # Lógica de negocio
├── 🗄️ UserRepository.ts    # Acceso a base de datos
├── 🔍 UserQueries.ts       # SQL colocalizado
├── ✅ UserSchemas.ts       # Validaciones Zod
├── 📘 UserTypes.ts         # Tipos TypeScript (Entity, Input)
├── 💬 UserMessages.ts      # Strings i18n (ES/EN)
├── ❌ UserErrors.ts        # Clases de error personalizadas
└── 📦 UserModule.ts        # REGISTRO de Módulo y exportaciones
```

## Servicios y Repositorios

Para mantener el código limpio:

- **BO**: Orquesta (HTTP -> BO -> Service).
- **Service**: Extiende `BOService`. Contiene lógica de negocio pura.
- **Repository**: Usa `db.query<T>` con tipos y SQL colocalizado.

```typescript
// Repository
import { IDatabase } from '../../src/core/business-objects/index.js'
import { UserQueries, Types } from './UserModule.js'

export class UserRepository implements Types.IUserRepository {
    constructor(private db: IDatabase) {}

    async findById(id: number): Promise<Types.User | null> {
        // Types.User es un type alias, compatible con Record<string, unknown>
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
        // ... lógica
    }
}
```
