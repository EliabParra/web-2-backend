import { IDatabase } from '@toproc/types'
import { CategoryQueries, Types } from './CategoryModule.js'

/**
 * Repositorio para operaciones de base de datos de CategoryBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class CategoryRepository implements Types.ICategoryRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los categorys
     */
    async findAll(): Promise<Types.CategorySummary[]> {
        const result = await this.db.query<Types.CategorySummary>(CategoryQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca category por ID
     */
    async findById(id: number): Promise<Types.Category | null> {
        const result = await this.db.query<Types.Category>(CategoryQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo category
     */
    async create(data: Partial<Types.Category>): Promise<Types.Category> {
        const result = await this.db.query<Types.Category>(CategoryQueries.create, [
            data.category_de,
            data.category_type_id,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza category
     */
    async update(id: number, data: Partial<Types.Category>): Promise<Types.Category | null> {
        const result = await this.db.query<Types.Category>(CategoryQueries.update, [
            id,
            data.category_de,
            data.category_type_id,
        ])
        return result.rows[0]
    }

    /**
     * Elimina category
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountCategory>(CategoryQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si category existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsCategory>(CategoryQueries.exists, [id])
        return result.rows[0].exists
    }
}
