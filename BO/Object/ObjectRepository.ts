import { IDatabase } from '@toproc/types'
import { ObjectQueries, Types } from './ObjectModule.js'

/**
 * Repositorio para operaciones de base de datos de ObjectBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class ObjectRepository implements Types.IObjectRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los objects
     */
    async findAll(): Promise<Types.ObjectSummary[]> {
        const result = await this.db.query<Types.ObjectSummary>(ObjectQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca object por ID
     */
    async findById(id: number): Promise<Types.Object | null> {
        const result = await this.db.query<Types.Object>(ObjectQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo object
     */
    async create(data: Partial<Types.Object>): Promise<Types.Object> {
        const result = await this.db.query<Types.Object>(ObjectQueries.create, [
            data.object_na,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza object
     */
    async update(id: number, data: Partial<Types.Object>): Promise<Types.Object | null> {
        const result = await this.db.query<Types.Object>(ObjectQueries.update, [
            id,
            data.object_na,
        ])
        return result.rows[0]
    }

    /**
     * Elimina object
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountObject>(ObjectQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si object existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsObject>(ObjectQueries.exists, [id])
        return result.rows[0].exists
    }
}
