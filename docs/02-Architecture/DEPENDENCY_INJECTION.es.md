# Inyección de Dependencias y Lazy Loading

Explicación técnica de cómo el framework gestiona las dependencias de los Business Objects.

## Arquitectura de Dependencias

### Núcleo `IContainer`

El framework utiliza un contenedor centralizado de **Inversión de Control (IoC)** para gestionar las dependencias. En lugar de inyección estricta de propiedades, todos los Business Objects y Servicios reciben el `IContainer`.

```typescript
// src/types/core.ts
export interface IContainer {
    resolve<T>(key: string): T
    register<T>(key: string, instance: T): void
    registerFactory<T>(key: string, factory: (c: IContainer) => T): void
    has(key: string): boolean
}
```

### Clase Base `BaseBO`

Los Business Objects extienden `BaseBO`, el cual recibe el contenedor y resuelve estrictamente las dependencias core:

```typescript
// src/core/business-objects/BaseBO.ts
export class BaseBO {
    protected readonly db: IDatabase
    protected readonly log: ILogger
    protected readonly config: IConfig
    protected readonly container: IContainer
    // ... otras dependencias (i18n, validator) se resuelven bajo demanda

    constructor(container: IContainer) {
        this.container = container
        this.db = container.resolve<IDatabase>('db')
        this.log = container.resolve<ILogger>('log')
        this.config = container.resolve<IConfig>('config')
        // ...
    }
}
```

## Flujo de Inyección y Registro de Módulos

El framework soporta un **Patrón de Auto-Registro** donde cada módulo funcional es responsable de registrar sus propios servicios en el contenedor.

```
┌──────────────┐     ┌───────────┐     ┌───────────────────────┐
│  foundation  │────▶│ AppServer │────▶│ TransactionController │
│ (Auth/Cont.) │     │  (setup)  │     │       (HTTP)          │
└──────────────┘     └───────────┘     └───────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────┐     ┌────────────────────┐
│  TransactionExecutor  │◀────│   SecurityService  │
│   (import dinámico)   │     │    (orquestar)     │
└───────────────────────┘     └────────────────────┘
            │
            ▼
  ┌─────────────────────┐       ┌────────────────────┐
  │   Business Object   │──────▶│   Module Factory   │
  │    (IContainer)     │       │ (registerService)  │
  └─────────────────────┘       └────────────────────┘
```

1. **foundation.ts**: Crea el `IContainer` raíz con servicios core (`db`, `log`, `security`).
2. **TransactionExecutor**: Importa dinámicamente la clase del BO.
3. **Business Object**: Se instancia con `new BO(container)`.
4. **Auto-Registro**: El constructor del BO llama a la función de registro de su módulo (ej., `registerProducts(container)`).
5. **Resolución de Servicio**: El BO resuelve su servicio específico (ej., `container.resolve('ProductService')`).

## Lazy Loading (Carga Perezosa)

Los Business Objects se cargan bajo demanda para optimizar el tiempo de arranque.

### Implementación (`TransactionExecutor.ts`)

```typescript
async execute(objectName: string, methodName: string, params: unknown) {
    // 1. Construir ruta del módulo
    const modulePath = `../../BO/${objectName}/${objectName}BO.js`

    // 2. Import dinámico (solo cuando se necesita)
    const module = await import(modulePath)
    const BOClass = module[`${objectName}BO`]

    // 3. Instanciar con contenedor
    // El contenedor es inyectado en el Executor durante el setup del AppServer
    const instance = new BOClass(this.container)

    // 4. Ejecutar método
    return instance[methodName](params)
}
```

## Ventajas

| Característica      | Beneficio                                             |
| ------------------- | ----------------------------------------------------- |
| **Desacoplamiento** | BOs no necesitan saber cómo crear sus dependencias.   |
| **Testabilidad**    | Fácil mockeo de todo el `IContainer`.                 |
| **Modularidad**     | Módulos se registran solos; cero config en AppServer. |
| **Aislamiento**     | Error en un BO no afecta otros hasta ser invocado.    |

## Ver También

- [Bootstrap](./BOOTSTRAP.es.md) - Proceso de inicialización
- [AppServer Core](./APPSERVER_CORE.es.md) - Funcionamiento del servidor HTTP
- [Sistema de Seguridad](./SECURITY_SYSTEM.es.md) - Permisos y transacciones
