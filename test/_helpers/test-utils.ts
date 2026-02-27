/**
 * Utilidades estandarizadas para pruebas.
 *
 * Provee factories para crear dependencias mock con tipado estricto,
 * diseñadas para aislar Business Objects y Services del I/O real.
 *
 * @module test/_helpers/test-utils
 */

import type { IContainer, ILogger, IDatabase, II18nService, IEmailService } from '../../src/types/core.js'
import type { IAppConfig } from '../../src/types/config.js'
import { createMockContainer } from './mock-container.js'

/**
 * Crea un logger silencioso para pruebas.
 *
 * Todas las operaciones son no-op, evitando ruido en la salida de tests.
 *
 * @returns Logger que no produce salida
 */
export function silentLogger(): ILogger {
    const noop = () => {}
    const logger: ILogger = {
        trace: noop,
        debug: noop,
        info: noop,
        warn: noop,
        error: noop,
        critical: noop,
        child: () => logger,
    }
    return logger
}

/**
 * Crea una configuración mock para pruebas.
 *
 * Incluye valores por defecto razonables para todas las secciones,
 * con `overrides` para personalizar secciones específicas.
 *
 * @param overrides - Secciones de config a sobrescribir
 * @returns Configuración completa para tests
 */
export function mockConfig(overrides: Partial<IAppConfig> = {}): IAppConfig {
    return {
        app: {
            port: 3000,
            host: 'localhost',
            name: 'TestApp',
            lang: 'es',
            env: 'test',
            frontendMode: 'none',
            frontendUrl: 'http://localhost:3000',
            ...overrides.app,
        },
        db: {
            host: 'localhost',
            port: 5432,
            database: 'test_db',
            ...overrides.db,
        },
        session: {
            secret: 'test-secret',
            ...overrides.session,
        },
        cors: {
            enabled: false,
            ...overrides.cors,
        },
        log: {
            minLevel: 'error',
            ...overrides.log,
        },
        auth: {
            publicProfileId: 0,
            sessionProfileId: 1,
            saltRounds: 4,
            requireEmailVerification: true,
            emailVerificationPurpose: 'email_verification',
            ...overrides.auth,
        },
        email: {
            provider: 'console',
            from: 'test@test.com',
            ...overrides.email,
        },
        bo: {
            path: './BO',
            ...overrides.bo,
        },
        websocket: {
            adapter: 'memory',
            ...overrides.websocket,
        },
    }
}

/**
 * Crea un servicio i18n mock para pruebas.
 *
 * Retorna las claves de traducción tal cual, sin transformación,
 * permitiendo hacer aserciones directas sobre las claves usadas.
 *
 * @returns Servicio i18n stub
 */
export function mockI18n(): II18nService {
    return {
        currentLocale: 'es',
        messages: {} as II18nService['messages'],
        translate: (key: string) => key,
        formatDate: (date: Date | number) => String(date),
        formatCurrency: (amount: number, currency: string) => `${amount} ${currency}`,
        format: (template: string, params?: Record<string, unknown>) => {
            if (!params) return template
            let result = template
            for (const [key, value] of Object.entries(params)) {
                result = result.replace(`{${key}}`, String(value))
            }
            return result
        },
        use: <T>(messageSet: Record<string, T>): NonNullable<T> => {
            return (messageSet['es'] ?? messageSet[Object.keys(messageSet)[0]]) as NonNullable<T>
        },
        error: () => ({ msg: 'Error', code: 500 }),
        errorKey: () => ({ msg: 'Error', code: 500 }),
        get: (key: string) => key,
    }
}

/**
 * Crea un servicio de email mock para pruebas.
 *
 * Todas las operaciones resuelven exitosamente sin enviar correos reales.
 *
 * @returns Servicio email stub
 */
export function mockEmail(): IEmailService {
    return {
        send: async () => ({ ok: true, mode: 'test' }),
        sendTemplate: async () => ({ ok: true, mode: 'test' }),
        maskEmail: (email: string) => {
            if (!email) return ''
            const [local, domain] = email.split('@')
            if (!domain) return email
            return `${local.slice(0, 2)}***@${domain}`
        },
    }
}

/**
 * Tipo para funciones mock con tracking de llamadas.
 *
 * Extiende una función con metadata de invocaciones
 * para hacer aserciones sobre las llamadas recibidas.
 */
export interface MockFn<TArgs extends unknown[] = unknown[], TReturn = unknown> {
    (...args: TArgs): TReturn
    /** Historial de llamadas recibidas */
    calls: TArgs[]
    /** Cantidad de veces que fue invocada */
    callCount: number
    /** Resetea el historial de llamadas */
    reset: () => void
}

/**
 * Crea una función mock con tracking de llamadas.
 *
 * @param implementation - Implementación a ejecutar cuando se llame
 * @returns Función mock con metadata de invocaciones
 *
 * @example
 * ```typescript
 * const fn = createMockFn(() => 'result')
 * fn('arg1')
 * assert.strictEqual(fn.callCount, 1)
 * assert.deepStrictEqual(fn.calls[0], ['arg1'])
 * ```
 */
export function createMockFn<TArgs extends unknown[] = unknown[], TReturn = unknown>(
    implementation: (...args: TArgs) => TReturn = (() => undefined) as () => TReturn
): MockFn<TArgs, TReturn> {
    const calls: TArgs[] = []

    const fn = ((...args: TArgs) => {
        calls.push(args)
        return implementation(...args)
    }) as MockFn<TArgs, TReturn>

    fn.calls = calls
    Object.defineProperty(fn, 'callCount', { get: () => calls.length })
    fn.reset = () => { calls.length = 0 }

    return fn
}

/**
 * Crea una base de datos mock para pruebas.
 *
 * El método `query` devuelve filas vacías por defecto.
 * Usa `queryResult` para definir las filas que debe retornar.
 *
 * @param queryResult - Filas a retornar por `query()` por defecto
 * @returns Database mock con `query`, `exeRaw` y `shutdown`
 */
export function mockDb(queryResult: Record<string, unknown>[] = []): IDatabase {
    return {
        pool: {} as IDatabase['pool'],
        exeRaw: async () => ({ rows: queryResult, rowCount: queryResult.length }),
        query: async () => ({ rows: queryResult as never[], rowCount: queryResult.length }),
        shutdown: async () => {},
    }
}

/**
 * Crea un validador mock para pruebas.
 *
 * @param valid - Si la validación debe pasar (`true`) o fallar (`false`)
 * @returns Validador mock
 */
export function mockValidator(valid = true) {
    return {
        validate: <T>(data: unknown) =>
            valid
                ? { valid: true as const, data: data as T }
                : { valid: false as const, errors: [{ path: 'field', message: 'Invalid' }] },
    }
}

/**
 * Crea un contenedor de pruebas con dependencias estándar pre-configuradas.
 *
 * Registra automáticamente: `log`, `config`, `db`, `i18n`, `email`, `validator`.
 * Acepta `overrides` para reemplazar o agregar dependencias adicionales.
 *
 * @param overrides - Dependencias personalizadas a inyectar
 * @returns Contenedor `IContainer` listo para instanciar BOs/Services
 *
 * @example
 * ```typescript
 * const container = createTestContainer({
 *     AuthService: mockAuthService,
 * })
 * const bo = new AuthBO(container)
 * ```
 */
export function createTestContainer(overrides: Record<string, unknown> = {}): IContainer {
    return createMockContainer({
        log: silentLogger(),
        config: mockConfig(),
        db: mockDb(),
        i18n: mockI18n(),
        email: mockEmail(),
        validator: mockValidator(),
        ...overrides,
    })
}
