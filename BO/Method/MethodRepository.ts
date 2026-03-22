import { IDatabase } from '@toproc/types'
import { MethodQueries, Types } from './MethodModule.js'

/**
 * Repositorio para operaciones de base de datos de MethodBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class MethodRepository implements Types.IMethodRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los methods
     */
    async findAll(): Promise<Types.MethodSummary[]> {
        const result = await this.db.query<Types.MethodSummary>(MethodQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca method por ID
     */
    async findById(id: number): Promise<Types.Method | null> {
        const result = await this.db.query<Types.Method>(MethodQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo method
     */
    async create(data: Partial<Types.Method>): Promise<Types.Method> {
        const result = await this.db.query<Types.Method>(MethodQueries.create, [
            data.method_na,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza method
     */
    async update(id: number, data: Partial<Types.Method>): Promise<Types.Method | null> {
        const result = await this.db.query<Types.Method>(MethodQueries.update, [
            id,
            data.method_na,
        ])
        return result.rows[0]
    }

    /**
     * Elimina method
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountMethod>(MethodQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si method existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsMethod>(MethodQueries.exists, [id])
        return result.rows[0].exists
    }
}
