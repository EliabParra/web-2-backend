import type { IContainer } from '../types/core.js'

/**
 * Contenedor IoC (Inversión de Control).
 *
 * Gestiona el ciclo de vida de las dependencias de la aplicación mediante
 * registro directo de instancias o factories con inicialización lazy.
 *
 * Patrón Singleton: una única instancia global accesible vía `Container.getInstance()`.
 *
 * @example
 * ```typescript
 * const container = Container.getInstance()
 *
 * // Registro directo (valor ya instanciado)
 * container.register('config', configObject)
 *
 * // Registro de factory (lazy — se ejecuta en el primer resolve)
 * container.registerFactory('db', (c) => new DatabaseService(c))
 *
 * // Resolución (ejecuta factory si es necesario, cachea resultado)
 * const db = container.resolve<IDatabase>('db')
 * ```
 */
export class Container implements IContainer {
    private static instance: Container

    /** Instancias ya resueltas (cache) */
    private instances = new Map<string, unknown>()

    /** Factories pendientes de inicialización */
    private factories = new Map<string, (container: IContainer) => unknown>()

    private constructor() {}

    /**
     * Obtiene la instancia singleton del contenedor.
     *
     * @returns Instancia única del contenedor
     */
    static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container()
        }
        return Container.instance
    }

    /**
     * Registra una instancia ya construida en el contenedor.
     *
     * @template T - Tipo del servicio
     * @param key - Clave única de identificación
     * @param instance - Instancia del servicio
     */
    register<T>(key: string, instance: T): void {
        this.instances.set(key, instance)
        // Si había una factory con esta key, la eliminamos (la instancia tiene prioridad)
        this.factories.delete(key)
    }

    /**
     * Registra una factory para inicialización lazy.
     *
     * La factory se ejecuta en el primer `resolve()` y el resultado se cachea.
     * Llamadas subsecuentes a `resolve()` retornan la instancia cacheada.
     *
     * @template T - Tipo del servicio que produce la factory
     * @param key - Clave única de identificación
     * @param factory - Función que recibe el contenedor y retorna la instancia
     */
    registerFactory<T>(key: string, factory: (container: IContainer) => T): void {
        this.factories.set(key, factory as (container: IContainer) => unknown)
        // Si había una instancia previa con esta key, la eliminamos
        this.instances.delete(key)
    }

    /**
     * Resuelve una dependencia por su clave.
     *
     * 1. Si existe una instancia cacheada, la retorna.
     * 2. Si existe una factory registrada, la ejecuta, cachea el resultado y lo retorna.
     * 3. Si no existe nada, lanza un error descriptivo.
     *
     * @template T - Tipo esperado del servicio
     * @param key - Clave de la dependencia a resolver
     * @returns Instancia del servicio
     * @throws {Error} Si la clave no está registrada
     */
    resolve<T>(key: string): T {
        // 1. Instancia cacheada
        if (this.instances.has(key)) {
            return this.instances.get(key) as T
        }

        // 2. Factory pendiente → ejecutar y cachear
        const factory = this.factories.get(key)
        if (factory) {
            const instance = factory(this)
            this.instances.set(key, instance)
            this.factories.delete(key)
            return instance as T
        }

        // 3. No registrado
        throw new Error(
            `[Container] Servicio no encontrado: '${key}'. ` +
                `Registrados: [${[...this.instances.keys(), ...this.factories.keys()].join(', ')}]`
        )
    }

    /**
     * Verifica si una clave está registrada (como instancia o factory).
     *
     * @param key - Clave a verificar
     * @returns `true` si la clave existe, `false` en caso contrario
     */
    has(key: string): boolean {
        return this.instances.has(key) || this.factories.has(key)
    }
}

export const container = Container.getInstance()
