import { IDatabase } from '@toproc/types'
import { LapseQueries, Types } from './LapseModule.js'

/**
 * Repositorio para operaciones de base de datos de LapseBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class LapseRepository implements Types.ILapseRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los lapses
     */
    async findAll(filters?: Types.GetAllLapseInput): Promise<Types.LapseSummary[]> {
        const result = await this.db.query<Types.LapseSummary>(LapseQueries.findAll, [
            filters?.lapse_de ?? null,
            filters?.lapse_act ?? null,
            filters?.lapse_start_dt ?? null,
            filters?.lapse_close_dt ?? null,
        ])
        return result.rows
    }

    /**
     * Busca lapse por ID
     */
    async findById(id: number): Promise<Types.Lapse | null> {
        const result = await this.db.query<Types.Lapse>(LapseQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo lapse
     */
    async create(data: Partial<Types.Lapse>): Promise<Types.Lapse> {
        const result = await this.db.query<Types.Lapse>(LapseQueries.create, [
            data.lapse_de,
            data.lapse_act,
            data.lapse_start_dt,
            data.lapse_close_dt,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza lapse
     */
    async update(id: number, data: Partial<Types.Lapse>): Promise<Types.Lapse | null> {
        const result = await this.db.query<Types.Lapse>(LapseQueries.update, [
            id,
            data.lapse_de,
            data.lapse_act,
            data.lapse_start_dt,
            data.lapse_close_dt,
        ])
        return result.rows[0]
    }

    /**
     * Elimina lapse
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountLapse>(LapseQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si lapse existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsLapse>(LapseQueries.exists, [id])
        return result.rows[0].exists
    }

    async syncActiveByDate(): Promise<void> {
        await this.db.query(LapseQueries.syncActiveByDate, [])
    }
}
