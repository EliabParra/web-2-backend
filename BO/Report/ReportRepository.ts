import { IDatabase } from '@toproc/types'
import { ReportQueries, Types } from './ReportModule.js'

/**
 * Repositorio para operaciones de base de datos de ReportBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class ReportRepository implements Types.IReportRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los reports
     */
    async findAll(): Promise<Types.ReportSummary[]> {
        const result = await this.db.query<Types.ReportSummary>(ReportQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca report por ID
     */
    async findById(id: number): Promise<Types.Report | null> {
        const result = await this.db.query<Types.Report>(ReportQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo report
     */
    async create(data: Partial<Types.Report>): Promise<Types.Report> {
        const result = await this.db.query<Types.Report>(ReportQueries.create, [
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Actualiza report
     */
    async update(id: number, data: Partial<Types.Report>): Promise<Types.Report | null> {
        const result = await this.db.query<Types.Report>(ReportQueries.update, [
            id,
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Elimina report
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountReport>(ReportQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si report existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsReport>(ReportQueries.exists, [id])
        return result.rows[0].exists
    }
}
