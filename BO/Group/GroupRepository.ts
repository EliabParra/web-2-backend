import { IDatabase } from '@toproc/types'
import { GroupQueries, Types } from './GroupModule.js'

/**
 * Repositorio para operaciones de base de datos de GroupBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class GroupRepository implements Types.IGroupRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los groups
     */
    async findAll(): Promise<Types.GroupSummary[]> {
        const result = await this.db.query<Types.GroupSummary>(GroupQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca group por ID
     */
    async findById(id: number): Promise<Types.Group | null> {
        const result = await this.db.query<Types.Group>(GroupQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo group
     */
    async create(data: Partial<Types.Group>): Promise<Types.Group> {
        const result = await this.db.query<Types.Group>(GroupQueries.create, [
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Actualiza group
     */
    async update(id: number, data: Partial<Types.Group>): Promise<Types.Group | null> {
        const result = await this.db.query<Types.Group>(GroupQueries.update, [
            id,
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Elimina group
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountGroup>(GroupQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si group existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsGroup>(GroupQueries.exists, [id])
        return result.rows[0].exists
    }
}
