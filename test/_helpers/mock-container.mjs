/**
 * Creates a mock IContainer from a plain deps object.
 *
 * Usage:
 *   const container = createMockContainer({ db: mockDb, log: mockLog, config: mockConfig })
 *   const service = new SomeService(container) // works — container.resolve('db') returns mockDb
 *
 * @param {Record<string, unknown>} deps - Key-value pairs of service names to mock implementations
 * @returns {{ resolve: function, register: function, registerFactory: function, has: function }}
 */
export function createMockContainer(deps = {}) {
    const store = { ...deps }
    const container = {
        resolve(key) {
            if (!(key in store)) {
                throw new Error(`Mock container: '${key}' not registered`)
            }
            return store[key]
        },
        register(key, value) {
            store[key] = value
        },
        registerFactory(key, factory) {
            Object.defineProperty(store, key, {
                get: () => {
                    return factory(container)
                },
                configurable: true,
                enumerable: true,
            })
        },
        has(key) {
            return key in store
        },
    }
    return container
}
