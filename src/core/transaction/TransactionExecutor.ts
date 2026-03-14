import { ITransactionExecutor, ILogger, IContainer, IConfig } from '../../types/index.js'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Ejecutor de transacciones que carga e instancia dinámicamente Business Objects.
 *
 * Implementa medidas de seguridad estrictas:
 * 1. Verificación de "Path Containment" para evitar Path Traversal.
 * 2. Validación de módulos y clases existentes.
 * 3. Inyección automática de dependencias (DI).
 *
 * @class TransactionExecutor
 * @implements {ITransactionExecutor}
 */
export class TransactionExecutor implements ITransactionExecutor {
    private instances: Map<string, Record<string, unknown>> = new Map()
    private readonly boBasePath: string
    private log: ILogger
    private container: IContainer

    /**
     * Crea una instancia de TransactionExecutor.
     *
     * @param container - Contenedor de dependencias
     */
    constructor(container: IContainer) {
        this.container = container
        this.log = container.resolve<ILogger>('log').child({ category: 'TransactionExecutor' })

        const config = container.resolve<IConfig>('config')
        // Resolver ruta base una sola vez y asegurar que es absoluta
        const configPath = config.bo.path || '../../BO/'
        // Si el usuario configuró 'BO', lo normalizamos a 'BO/'
        const cleanPath = configPath.includes('BO') ? 'BO/' : configPath
        this.boBasePath = path.resolve(process.cwd(), cleanPath)
    }

    /**
     * Ejecuta dinámicamente un método de un Business Object.
     *
     * @param objectName - Nombre del Business Object (e.g. "User")
     * @param methodName - Nombre del método a ejecutar (e.g. "get")
     * @param params - Parámetros para el método
     * @returns {Promise<unknown>} Resultado de la ejecución del método
     * @throws {Error} Si no encuentra el módulo, clase, método o detecta violación de seguridad
     */
    async execute(
        objectName: string,
        methodName: string,
        params: Record<string, unknown> | null | undefined
    ): Promise<unknown> {
        let instance = this.instances.get(objectName)
        if (!instance) {
            const loaded = await this.loadBO(objectName)
            instance = loaded.instance
            this.instances.set(objectName, instance)
        }

        if (typeof instance[methodName] !== 'function') {
            throw new Error(`Método de BO no encontrado: ${objectName}.${methodName}`)
        }

        return await (instance as any)[methodName](params)
    }

    /**
     * Carga e instancia un Business Object de forma segura.
     */
    private async loadBO(objectName: string): Promise<{ instance: Record<string, unknown> }> {
        // 🛡️ SECURITY: Path Containment Check
        // 1. Construir ruta absoluta esperada
        const expectedPath = path.resolve(this.boBasePath, objectName, `${objectName}BO`)

        // 2. Verificar que la ruta resultante sigue estando dentro de boBasePath
        // Previene ataques tipo "param: ../../etc/passwd" aunque validación previa fallase
        if (!expectedPath.startsWith(this.boBasePath)) {
            this.log.error(`SECURITY: Path Traversal attempt detected. ObjectName: ${objectName}`)
            throw new Error('Access Denied: Invalid Object Path')
        }

        // Convert file path to URL for ESM import compatibility on Windows (file://...)
        const baseUrl = pathToFileURL(expectedPath).href
        const modulePathJs = `${baseUrl}.js`
        const modulePathTs = `${baseUrl}.ts`

        try {
            const mod = await this.importBoModule(modulePathJs, modulePathTs)
            const ctorName = `${objectName}BO`
            const ctor = mod[ctorName]

            if (typeof ctor !== 'function') {
                throw new Error(`Clase de BO no encontrada: ${ctorName} en ${expectedPath}`)
            }

            // Instantiate BO with Container
            const instance = new (ctor as new (container: IContainer) => Record<string, unknown>)(
                this.container
            )
            return { instance }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            this.log.error(`Fallo en carga de BO ${objectName}: ${msg}`, {
                objectName,
                path: expectedPath,
            })
            throw err
        }
    }

    private async importBoModule(
        modulePathJs: string,
        modulePathTs: string
    ): Promise<Record<string, unknown>> {
        try {
            return (await import(modulePathJs)) as Record<string, unknown>
        } catch (err: unknown) {
            if (!this.isModuleNotFound(err)) throw err
            // Fallback for dev environment (ts-node/tsx)
            return (await import(modulePathTs)) as Record<string, unknown>
        }
    }

    private isModuleNotFound(err: unknown): boolean {
        const code =
            err && typeof err === 'object' && 'code' in err
                ? (err as { code?: unknown }).code
                : undefined
        if (code === 'ERR_MODULE_NOT_FOUND') return true
        const msg =
            err && typeof err === 'object' && 'message' in err
                ? String((err as { message?: unknown }).message ?? '')
                : ''
        return msg.includes('Cannot find module') || msg.includes('ERR_MODULE_NOT_FOUND')
    }
}
