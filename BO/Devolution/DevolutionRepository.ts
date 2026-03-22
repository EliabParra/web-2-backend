import { IDatabase } from '@toproc/types'
import { DevolutionQueries, Types } from './DevolutionModule.js'

/**
 * Repositorio para operaciones de base de datos de DevolutionBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class DevolutionRepository implements Types.IDevolutionRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los devolutions
     */
    async findAll(): Promise<Types.DevolutionSummary[]> {
        const result = await this.db.query<Types.DevolutionSummary>(DevolutionQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca devolution por ID
     */
    async findById(id: number): Promise<Types.Devolution | null> {
        const result = await this.db.query<Types.Devolution>(DevolutionQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo devolution
     */
    async create(data: Partial<Types.Devolution>): Promise<Types.Devolution> {
        const result = await this.db.query<Types.Devolution>(DevolutionQueries.create, [
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Actualiza devolution
     */
    async update(id: number, data: Partial<Types.Devolution>): Promise<Types.Devolution | null> {
        const result = await this.db.query<Types.Devolution>(DevolutionQueries.update, [
            id,
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Elimina devolution
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountDevolution>(DevolutionQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si devolution existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsDevolution>(DevolutionQueries.exists, [id])
        return result.rows[0].exists
    }
}
