import { IDatabase } from '@toproc/types'
import { LocationQueries, Types } from './LocationModule.js'

/**
 * Repositorio para operaciones de base de datos de LocationBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class LocationRepository implements Types.ILocationRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los locations
     */
    async findAll(): Promise<Types.LocationSummary[]> {
        const result = await this.db.query<Types.LocationSummary>(LocationQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca location por ID
     */
    async findById(id: number): Promise<Types.Location | null> {
        const result = await this.db.query<Types.Location>(LocationQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo location
     */
    async create(data: Partial<Types.Location>): Promise<Types.Location> {
        const result = await this.db.query<Types.Location>(LocationQueries.create, [
            data.location_de,
            data.location_sh,
            data.location_dr,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza location
     */
    async update(id: number, data: Partial<Types.Location>): Promise<Types.Location | null> {
        const result = await this.db.query<Types.Location>(LocationQueries.update, [
            id,
            data.location_de,
            data.location_sh,
            data.location_dr,
        ])
        return result.rows[0]
    }

    /**
     * Elimina location
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountLocation>(LocationQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si location existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsLocation>(LocationQueries.exists, [id])
        return result.rows[0].exists
    }
}
