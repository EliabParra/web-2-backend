# Guía de Testing

## Framework

Usamos el **Node.js Test Runner** nativo (`node:test`) con `tsx` para ejecutar TypeScript. Sin Jest ni Vitest.

## Estructura de Directorios

```
test/
├── setup.ts                        # Bootstrap (variables de entorno)
├── _helpers/
│   ├── test-utils.ts               # Factories de mocks (container, logger, db, i18n, email)
│   ├── mock-container.ts           # Mock de IContainer con inyección de dependencias
│   └── global-state.ts             # Utilidades de aislamiento de estado global
├── __fixtures__/
│   └── auth.fixtures.ts            # Datos de prueba centralizados para Auth
├── bo/
│   └── Auth/
│       ├── AuthBO.test.ts          # Pruebas unitarias del BO
│       └── AuthService.test.ts     # Pruebas unitarias del servicio
└── integration/
    └── auth.http.test.ts           # Pruebas de integración HTTP
```

## Convenciones

### Nombrado

- Archivos: `[Modulo].test.ts`
- Tests: `should [comportamiento esperado] when [estado/condición]`

### Patrón: AAA (Arrange, Act, Assert)

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

### Reglas

- **Sin `any`** — usar `Partial<T>`, `Record<string, unknown>`, o interfaces propias
- **Sin magic strings** — centralizar datos de prueba en `test/__fixtures__/`
- **Sin I/O real** — mockear `db`, `email`, `i18n` vía `createTestContainer()`
- **TypeDoc en español** — todos los helpers de test deben tener comentarios TSDoc

## Escribir un Test Unitario

### 1. Importar utilidades

```typescript
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createTestContainer, createMockFn } from '../../_helpers/test-utils.js'
```

### 2. Crear dependencias mock

```typescript
function createBOWithMocks() {
    const service = {
        miMetodo: createMockFn(async () => resultadoEsperado),
    }
    const container = createTestContainer({ MiServicio: service })
    return { bo: new MiBO(container), service }
}
```

### 3. Escribir tests con AAA

```typescript
describe('MiBO', () => {
    let bo: MiBO
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
        const result = await bo.miMetodo(params)

        // Assert
        assert.equal(result.code, 200)
        assert.equal(service.miMetodo.callCount, 1)
    })
})
```

## Utilidades Clave

| Utilidad                         | Propósito                                                 |
| -------------------------------- | --------------------------------------------------------- |
| `createTestContainer(overrides)` | Crea `IContainer` con mocks estándar pre-registrados      |
| `silentLogger()`                 | Logger que no produce salida                              |
| `mockConfig(overrides)`          | `IAppConfig` completo con defaults de test                |
| `mockI18n()`                     | Stub de i18n que retorna las claves tal cual              |
| `mockEmail()`                    | Stub de email que resuelve sin enviar                     |
| `mockDb(rows)`                   | Stub de base de datos que retorna las filas indicadas     |
| `zodValidator()`                 | Validador que usa `safeParse` real de Zod                 |
| `createMockFn(impl)`             | Función con tracking de llamadas (`.calls`, `.callCount`) |

## Comandos

| Comando                                                                         | Descripción                       |
| ------------------------------------------------------------------------------- | --------------------------------- |
| `pnpm test`                                                                     | Ejecutar todos los tests          |
| `pnpm run test:watch`                                                           | Modo watch                        |
| `pnpm run test:coverage`                                                        | Con reporte de cobertura c8       |
| `pnpm run verify`                                                               | Typecheck + build + smoke + tests |
| `node --import tsx --import ./test/setup.ts --test test/bo/Auth/AuthBO.test.ts` | Un solo archivo                   |
