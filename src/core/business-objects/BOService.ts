import { IDatabase, ILogger, IConfig, II18nService, IContainer } from '@toproc/types'

/**
 * Clase base para Servicios de Lógica de Negocio (BOServices).
 *
 * Provee acceso tipado a las dependencias core: DB, Log, Config.
 * Evita la repetición de constructores en cada servicio.
 */
export abstract class BOService {
    protected readonly db: IDatabase
    protected readonly log: ILogger
    protected readonly config: IConfig
    protected readonly i18n: II18nService

    constructor(container: IContainer) {
        // Auto-categorization: "AuthService" -> "Auth"
        const category = this.constructor.name.replace('Service', '')

        this.log = container.resolve<ILogger>('log').child({ category })
        this.config = container.resolve<IConfig>('config')
        this.db = container.resolve<IDatabase>('db')
        this.i18n = container.resolve<II18nService>('i18n')
    }

    /**
     * Ejecuta una consulta que retorna un solo registro.
     */
    protected async queryOne<T extends Record<string, unknown>>(
        query: string,
        params: any[] = []
    ): Promise<T | null> {
        const result = await this.db.query<T>(query, params)
        return result.rows[0] || null
    }

    /**
     * Ejecuta una consulta que retorna múltiples registros.
     */
    protected async queryMany<T extends Record<string, unknown>>(
        query: string,
        params: any[] = []
    ): Promise<T[]> {
        const result = await this.db.query<T>(query, params)
        return result.rows
    }

    /**
     * Verifica si existe un registro.
     * Asume que la query retorna { exists: boolean }.
     */
    protected async queryExists(query: string, params: any[] = []): Promise<boolean> {
        const result = await this.db.query<{ exists: boolean }>(query, params)
        return result.rows[0]?.exists ?? false
    }

    /**
     * Ejecuta una acción de forma segura, logueando errores automáticamente.
     */
    protected async safeExecute<T>(action: () => Promise<T>, errorMessage: string): Promise<T> {
        try {
            return await action()
        } catch (error) {
            this.log.error(
                `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`
            )
            throw error
        }
    }

    /**
     * Helper para obtener un único resultado o null de una consulta
     */
    protected oneOrNull<T>(rows: T[]): T | null {
        return rows.length > 0 ? rows[0] : null
    }

    /**
     * Helper para mapear resultados si es necesario
     */
    protected mapRows<T, U>(rows: T[], mapper: (row: T) => U): U[] {
        return rows.map(mapper)
    }
}
