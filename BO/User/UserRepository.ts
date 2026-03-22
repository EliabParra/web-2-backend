import { IDatabase } from '@toproc/types'
import { UserQueries, Types } from './UserModule.js'

/**
 * Repositorio para operaciones de base de datos de UserBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class UserRepository implements Types.IUserRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los users
     */
    async findAll(): Promise<Types.UserSummary[]> {
        const result = await this.db.query<Types.UserSummary>(UserQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca user por ID
     */
    async findById(id: number): Promise<Types.User | null> {
        const result = await this.db.query<Types.User>(UserQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo user
     */
    async create(data: Partial<Types.User>): Promise<Types.User> {
        const result = await this.db.query<Types.User>(UserQueries.create, [
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Actualiza user
     */
    async update(id: number, data: Partial<Types.User>): Promise<Types.User | null> {
        const result = await this.db.query<Types.User>(UserQueries.update, [
            id,
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Elimina user
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountUser>(UserQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si user existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsUser>(UserQueries.exists, [id])
        return result.rows[0].exists
    }
}
