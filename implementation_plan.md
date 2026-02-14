# Refactorización DI — Plan Completo (TODOS los archivos)

## Diagnóstico: Anti-patrones Detectados

| Anti-patrón | Dónde | Impacto |
|---|---|---|
| **Prop-drilling masivo** | Todos los constructores | Cada nuevo servicio requiere editar 5+ archivos |
| **God Object** | [AppServer.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/AppServer.ts) (333 líneas) | Crea 7+ clases manualmente, 9 deps en constructor |
| **Duplicate Instantiation** | [SecurityService](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/services/SecurityService.ts#40-301) crea [TransactionExecutor](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/transaction/TransactionExecutor.ts#16-143), y [AppServer](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/AppServer.ts#76-333) crea otro | 2 [TransactionExecutor](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/transaction/TransactionExecutor.ts#16-143) vivos, 2 [PermissionGuard](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/security/PermissionGuard.ts#13-157) |
| **BODependencies monolítico** | [TransactionExecutor](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/transaction/TransactionExecutor.ts#16-143) → todos los BOs | Todos los BOs reciben todo, imposibilita testing |
| **Container sin usar** | [foundation.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/foundation.ts) registra Y exporta named | Container es un paso extra, no la fuente de verdad |
| **Interfaces ad-hoc** | [AuthControllerDeps](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/controllers/AuthController.ts#14-22), [TransactionControllerDeps](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/controllers/TransactionController.ts#17-26), [PagesRouterArgs](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/router/pages.ts#22-29), [Dependencies](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/session/apply-session-middleware.ts#34-39), [FinalErrorHandlerArgs](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/final-error-handler.ts#11-16) | 6+ interfaces duplicadas para lo mismo |
| **CrudBO dead code** | [CrudBO.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/CrudBO.ts) | Nunca instanciado, viola Service/Repository |

---

## Fase 1: Container Rewrite + Types Cleanup

### [MODIFY] [Container.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/Container.ts)

Reescribir completamente:

```typescript
export class Container implements IContainer {
    private static instance: Container
    private instances = new Map<string, unknown>()
    private factories = new Map<string, (c: IContainer) => unknown>()

    register<T>(key: string, instance: T): void
    registerFactory<T>(key: string, factory: (c: IContainer) => T): void
    resolve<T>(key: string): T     // lazy: ejecuta factory en primer resolve, cachea
    has(key: string): boolean
}
```

- ❌ Eliminar todos los typed getters (`get config()`, `get log()`, etc.) — redundantes con `resolve<T>(key)`
- ❌ Eliminar imports de tipos específicos de servicios

### [MODIFY] [core.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/types/core.ts)

- ❌ Eliminar [BODependencies](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/types/core.ts#278-289) (líneas ~274-288)
- ❌ Eliminar JSDoc duplicado de [ILogger](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/types/core.ts#27-39) (líneas 7-9)
- ❌ Eliminar JSDoc huérfano de `IDatabase.query` (línea 143)
- ✏️ Expandir [IContainer](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/types/core.ts#253-256): agregar [register](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/BO/Auth/AuthService.ts#32-70), `registerFactory`, `has`
- ✏️ Reordenar en 6 grupos lógicos con TypeDoc español
- ✏️ Eliminar re-export `AppMessages` si no se usa externamente

---

## Fase 2: Migrar Servicios Core

### [MODIFY] [foundation.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/foundation.ts)

**Antes**: Instancia todo con `new` y exporta named + container.
**Después**: Solo registra factories vía `container.registerFactory()`. Exporta **solo** `container`.

```typescript
// DESPUÉS — foundation.ts
const container = Container.getInstance()
container.register('config', ConfigLoader.load(...))
container.register('i18n', new I18nService(...))
container.registerFactory('log', (c) => new AppLogger({ config: c.resolve('config') }))
container.registerFactory('db', (c) => new DatabaseService(c))
container.registerFactory('audit', (c) => new AuditService(c))
container.registerFactory('email', (c) => new EmailService(c))
container.registerFactory('validator', (c) => new ValidatorService(c.resolve('i18n')))
container.registerFactory('session', (c) => new SessionManager(c))
container.registerFactory('security', (c) => new SecurityService(c))
container.registerFactory('appServer', (c) => new AppServer(c))
export { container }
```

### [MODIFY] [index.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/index.ts)

```typescript
// DESPUÉS — Solo container
import { container } from './foundation.js'
const log = container.resolve<ILogger>('log')
const security = container.resolve<ISecurityService>('security')
const appServer = container.resolve<AppServer>('appServer')
```

### [MODIFY] [DatabaseService.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/services/DatabaseService.ts)

Constructor: `deps: {config, i18n, log}` → `container: IContainer`

### [MODIFY] [AuditService.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/services/AuditService.ts)

Constructor: `deps: {db, log}` → `container: IContainer`

### [MODIFY] [EmailService.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/services/EmailService.ts)

Constructor: `deps: {log, config}` → `container: IContainer`

### [MODIFY] [SessionService.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/services/SessionService.ts)

Constructor: `deps: {db, log, config, i18n, audit, validator}` → `container: IContainer`

### [MODIFY] [SecurityService.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/services/SecurityService.ts)

Constructor: `deps: {db, log, config, i18n, audit, session, validator, email}` → `container: IContainer`. Los subcomponentes internos (PermissionGuard, MenuProvider, TransactionMapper) se crean con `container.resolve('db')` y `container.resolve('log')` directamente.

---

## Fase 3: AppServer Desacoplamiento

### [MODIFY] [AppServer.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/AppServer.ts)

**El cambio más grande del proyecto**. AppServer pasa de God Object a simple orquestador.

- ❌ Eliminar [AppServerDependencies](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/AppServer.ts#53-64) interface (líneas 53-63)
- ❌ Eliminar 9 campos privados readonly individuales
- ✏️ Constructor: [constructor(container: IContainer)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/scripts/db/core/introspector.ts#23-27) — resuelve todo del container
- ✏️ [init()](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/AppServer.ts#168-268): Los subcomponentes (AuthorizationService, TransactionOrchestrator, etc.) se registran como factories o se crean usando `container.resolve()`

```typescript
// DESPUÉS
export class AppServer {
    constructor(private container: IContainer) { ... }

    async init() {
        const db = this.container.resolve<IDatabase>('db')
        const log = this.container.resolve<ILogger>('log')
        // SecurityService ya tiene guard+mapper+menuProvider internamente
        // TransactionOrchestrator y controllers usan container
        ...
    }
}
```

### [MODIFY] [AuthController.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/controllers/AuthController.ts)

- ❌ Eliminar [AuthControllerDeps](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/controllers/AuthController.ts#14-22) interface (dead code, líneas 14-21)
- ✏️ Constructor: [constructor(container: IContainer)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/scripts/db/core/introspector.ts#23-27) — resuelve session, audit, log, i18n

### [MODIFY] [TransactionController.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/controllers/TransactionController.ts)

- ❌ Eliminar [TransactionControllerDeps](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/controllers/TransactionController.ts#17-26) interface (líneas 17-25)
- ✏️ Constructor: [constructor(container: IContainer)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/scripts/db/core/introspector.ts#23-27)

### [MODIFY] [ProbeController.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/controllers/ProbeController.ts)

- ✏️ Constructor: [constructor(container: IContainer)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/scripts/db/core/introspector.ts#23-27) — resuelve security + config.app.name

### [MODIFY] [PageController.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/controllers/PageController.ts)

- ✏️ Constructor: [constructor(container: IContainer)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/scripts/db/core/introspector.ts#23-27) — resuelve log, i18n

---

## Fase 4: Middlewares + Rate-Limiters + Routers → Container

### Middlewares que **NO cambian** (sin deps dinámicas):
- [helmet.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/helmet.ts) — solo [(app)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) ✅
- [request-id.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/request-id.ts) — solo [(app)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) ✅
- [body-parsers.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/body-parsers.ts) — [(app, config)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) → cambia a [(app, container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179)

### [MODIFY] [cors.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/cors.ts)

[applyCorsIfEnabled(app, config)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/cors.ts#5-35) → [applyCorsIfEnabled(app, container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/cors.ts#5-35)

### [MODIFY] [request-logger.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/request-logger.ts)

[applyRequestLogger(app, log)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/request-logger.ts#5-58) → [applyRequestLogger(app, container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/request-logger.ts#5-58)

### [MODIFY] [csrf.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/csrf.ts)

[createCsrfProtection(i18n)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/csrf.ts#40-72) + [createCsrfTokenHandler(i18n)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/csrf.ts#22-39) → `create*(container)`

### [MODIFY] [json-syntax-error.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/json-syntax-error.ts)

[createJsonSyntaxErrorHandler(i18n)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/json-syntax-error.ts#4-39) → [createJsonSyntaxErrorHandler(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/json-syntax-error.ts#4-39)

### [MODIFY] [auth-check.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/auth-check.ts)

[createAuthCheckMiddleware(sessionService)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/auth-check.ts#4-19) → [createAuthCheckMiddleware(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/auth-check.ts#4-19)

### [MODIFY] [final-error-handler.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/final-error-handler.ts)

- ❌ Eliminar [FinalErrorHandlerArgs](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/final-error-handler.ts#11-16) type
- [createFinalErrorHandler({clientErrors, serverErrors, log})](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/final-error-handler.ts#17-105) → [createFinalErrorHandler(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/middleware/final-error-handler.ts#17-105)

### [MODIFY] [apply-session-middleware.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/session/apply-session-middleware.ts)

- ❌ Eliminar [Dependencies](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/session/apply-session-middleware.ts#34-39) type
- [applySessionMiddleware(app, {config, log, db})](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/session/apply-session-middleware.ts#40-86) → [applySessionMiddleware(app, container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/session/apply-session-middleware.ts#40-86)

### [MODIFY] [limiters.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/rate-limit/limiters.ts)

- [createLoginRateLimiter(clientErrors)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/rate-limit/limiters.ts#44-63) → [createLoginRateLimiter(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/rate-limit/limiters.ts#44-63)
- [createAuthPasswordResetRateLimiter(clientErrors, security)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/rate-limit/limiters.ts#64-149) → `create...(container)`
- [createToProccessRateLimiter(clientErrors)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/rate-limit/limiters.ts#150-174) → `create...(container)`

### [MODIFY] [pages.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/router/pages.ts)

- ❌ Eliminar [PagesRouterArgs](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/router/pages.ts#22-29) type
- [buildPagesRouter({session, config, i18n, log})](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/router/pages.ts#30-60) → [buildPagesRouter(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/api/http/router/pages.ts#30-60)

### [MODIFY] [frontend-adapters/index.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/frontend-adapters/index.ts)

- ❌ Eliminar [RegisterFrontendHostingArgs](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/frontend-adapters/index.ts#12-19) type
- [registerFrontendHosting(app, {session, stage, config, i18n, log})](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/frontend-adapters/index.ts#20-46) → [registerFrontendHosting(app, container, stage)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/frontend-adapters/index.ts#20-46)

---

## Fase 5: Security + Transaction Subcomponents

### [MODIFY] [AuthorizationService.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/security/AuthorizationService.ts)

Constructor: [(guard, log)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) → [(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) — resuelve guard y log

### [MODIFY] [PermissionGuard.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/security/PermissionGuard.ts)

Constructor: [(db, log)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) → [(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) — resuelve db y log

### [MODIFY] [MenuProvider.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/security/MenuProvider.ts)

Constructor: [(db, log)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) → [(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) — resuelve db y log

### [MODIFY] [TransactionMapper.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/transaction/TransactionMapper.ts)

Constructor: [(db, log)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) → [(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) — resuelve db y log

### [MODIFY] [TransactionExecutor.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/transaction/TransactionExecutor.ts)

Constructor: [(deps: BODependencies)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) → [(container: IContainer)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) — pasa container a BOs

### [MODIFY] [TransactionOrchestrator.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/transaction/TransactionOrchestrator.ts)

Constructor: [(mapper, auth, executor, log, audit, i18n)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179) (6 params!) → [(container)](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts#173-179)

---

## Fase 6: BO Layer

### [MODIFY] [BaseBO.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BaseBO.ts)

Constructor: `Partial<BODependencies>` → `container: IContainer`.
- Core (eagerly resolved): [db](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/Container.ts#44-47), [log](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/test/security.service.test.mjs#251-252), [config](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/.editorconfig), [i18n](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/Container.ts#50-53)
- Lazy (resolved on demand): [validator](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/Container.ts#59-62), [security](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/Container.ts#47-50), [audit](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/Container.ts#62-65), [email](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/Container.ts#65-68), [session](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/Container.ts#56-59)

### [DELETE] [CrudBO.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/CrudBO.ts)

Dead code. Viola Service/Repository pattern. Ningún BO real lo usa.

### [MODIFY] [BOService.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/BOService.ts)

Constructor → `container: IContainer`. Agregar helpers: `queryOne`, `queryMany`, `queryExists`, `safeExecute`.

### [MODIFY] [business-objects/index.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/index.ts)

Eliminar exports de [CrudBO](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/CrudBO.ts#12-72) y [BODependencies](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/types/core.ts#278-289).

---

## Fase 7: Auth Module PoC + CLI Templates

### [MODIFY] Auth Module — Agregar [register()](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/BO/Auth/AuthService.ts#32-70) function, simplificar exports
### [MODIFY] CLI Templates — Generar con [IContainer](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/types/core.ts#253-256) en lugar de [BODependencies](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/types/core.ts#278-289)

---

## Fase 8: Documentación + Verificación

- TypeDoc español en todas las clases modificadas
- Actualizar docs
- `pnpm run dev` + `pnpm test`

---

## Resumen de Impacto

| Categoría | Archivos |
|---|---|
| **Container + Types** | 2 |
| **Bootstrap** | 2 ([foundation.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/foundation.ts), [index.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/index.ts)) |
| **Services** | 6 (Database, Audit, Email, Session, Security, ValidatorService) |
| **AppServer** | 1 |
| **Controllers** | 4 (Auth, Transaction, Probe, Page) |
| **Middlewares** | 7 (cors, csrf, json-error, auth-check, request-logger, body-parsers, final-error) |
| **Session MW** | 1 |
| **Rate-Limiters** | 1 |
| **Router** | 1 (pages.ts) |
| **Frontend Adapters** | 1 |
| **Security** | 3 (AuthorizationService, PermissionGuard, MenuProvider) |
| **Transaction** | 3 (Mapper, Executor, Orchestrator) |
| **BO Layer** | 4 (BaseBO, BOService, CrudBO delete, barrel) |
| **Auth Module** | 3 (AuthBO, AuthService, AuthModule) |
| **CLI Templates** | 2 |
| **Total** | **~40 archivos** |
| **Eliminados** | [CrudBO.ts](file:///c:/Users/Eliab%20Parra/Dev/web-2-backend/src/core/business-objects/CrudBO.ts) + 6 interfaces ad-hoc |
