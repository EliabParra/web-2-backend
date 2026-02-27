/**
 * Mock tipado del contenedor IoC para pruebas.
 *
 * Implementa `IContainer` con un store en memoria que acepta
 * dependencias pre-construidas vía `overrides`.
 *
 * @module test/_helpers/mock-container
 */

import type { IContainer } from '../../src/types/core.js'

/**
 * Crea un contenedor mock que implementa `IContainer`.
 *
 * Incluye mocks por defecto para servicios de infraestructura
 * comunes (orchestrator, transactionMapper, etc.). Los `overrides`
 * se fusionan sobre los defaults, permitiendo reemplazar cualquier
 * dependencia sin afectar las demás.
 *
 * @param overrides - Dependencias personalizadas a inyectar
 * @returns Contenedor mock listo para usar en tests
 *
 * @example
 * ```typescript
 * const container = createMockContainer({ db: mockDb, log: silentLogger() })
 * const bo = new AuthBO(container)
 * ```
 */
export function createMockContainer(overrides: Record<string, unknown> = {}): IContainer {
    const defaultMocks: Record<string, unknown> = {
        orchestrator: { execute: async () => {} },
        transactionMapper: {
            load: async () => {},
            isReady: true,
            resolve: () => ({ objectName: 'Mock', methodName: 'mock' }),
        },
        transactionExecutor: { execute: async () => ({ code: 200, msg: 'ok' }) },
        permissionGuard: {
            load: async () => {},
            isReady: true,
            hasPermission: () => true,
            check: () => true,
            grant: async () => true,
            revoke: async () => true,
        },
        menuProvider: { load: async () => {} },
        authorization: { isAuthorized: () => true },
        authController: {},
        txController: {},
        probeController: {},
    }

    const store: Record<string, unknown> = { ...defaultMocks, ...overrides }

    const container: IContainer = {
        resolve<T>(key: string): T {
            if (!(key in store)) {
                throw new Error(`Mock container: '${key}' not registered`)
            }
            return store[key] as T
        },

        register<T>(key: string, value: T): void {
            store[key] = value
        },

        registerFactory<T>(key: string, factory: (c: IContainer) => T): void {
            Object.defineProperty(store, key, {
                get: () => factory(container),
                configurable: true,
                enumerable: true,
            })
        },

        has(key: string): boolean {
            return key in store
        },
    }

    return container
}
