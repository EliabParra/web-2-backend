import { IDatabase } from '@toproc/types'
import { MenuQueries, Types } from './MenuModule.js'

/**
 * Repositorio para operaciones de base de datos de MenuBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class MenuRepository implements Types.IMenuRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los menus
     */
    async findAll(): Promise<Types.MenuSummary[]> {
        const result = await this.db.query<Types.MenuSummary>(MenuQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca menu por ID
     */
    async findById(id: number): Promise<Types.Menu | null> {
        const result = await this.db.query<Types.Menu>(MenuQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo menu
     */
    async create(data: Partial<Types.Menu>): Promise<Types.Menu> {
        const result = await this.db.query<Types.Menu>(MenuQueries.create, [
            data.menu_na,
            data.subsystem_id,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza menu
     */
    async update(id: number, data: Partial<Types.Menu>): Promise<Types.Menu | null> {
        const result = await this.db.query<Types.Menu>(MenuQueries.update, [
            id,
            data.menu_na,
            data.subsystem_id,
        ])
        return result.rows[0]
    }

    /**
     * Elimina menu
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountMenu>(MenuQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si menu existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsMenu>(MenuQueries.exists, [id])
        return result.rows[0].exists
    }
}
