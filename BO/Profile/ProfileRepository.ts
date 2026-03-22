import { IDatabase } from '@toproc/types'
import { ProfileQueries, Types } from './ProfileModule.js'

/**
 * Repositorio para operaciones de base de datos de ProfileBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class ProfileRepository implements Types.IProfileRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los profiles
     */
    async findAll(): Promise<Types.ProfileSummary[]> {
        const result = await this.db.query<Types.ProfileSummary>(ProfileQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca profile por ID
     */
    async findById(id: number): Promise<Types.Profile | null> {
        const result = await this.db.query<Types.Profile>(ProfileQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo profile
     */
    async create(data: Partial<Types.Profile>): Promise<Types.Profile> {
        const result = await this.db.query<Types.Profile>(ProfileQueries.create, [
            data.profile_na,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza profile
     */
    async update(id: number, data: Partial<Types.Profile>): Promise<Types.Profile | null> {
        const result = await this.db.query<Types.Profile>(ProfileQueries.update, [
            id,
            data.profile_na,
        ])
        return result.rows[0]
    }

    /**
     * Elimina profile
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountProfile>(ProfileQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si profile existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsProfile>(ProfileQueries.exists, [id])
        return result.rows[0].exists
    }
}
