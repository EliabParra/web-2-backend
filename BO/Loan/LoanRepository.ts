import { IDatabase } from '@toproc/types'
import { LoanQueries, Types } from './LoanModule.js'

/**
 * Repositorio para operaciones de base de datos de LoanBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class LoanRepository implements Types.ILoanRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los loans
     */
    async findAll(): Promise<Types.LoanSummary[]> {
        const result = await this.db.query<Types.LoanSummary>(LoanQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca loan por ID
     */
    async findById(id: number): Promise<Types.Loan | null> {
        const result = await this.db.query<Types.Loan>(LoanQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo loan
     */
    async create(data: Partial<Types.Loan>): Promise<Types.Loan> {
        const result = await this.db.query<Types.Loan>(LoanQueries.create, [
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Actualiza loan
     */
    async update(id: number, data: Partial<Types.Loan>): Promise<Types.Loan | null> {
        const result = await this.db.query<Types.Loan>(LoanQueries.update, [
            id,
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Elimina loan
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountLoan>(LoanQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si loan existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsLoan>(LoanQueries.exists, [id])
        return result.rows[0].exists
    }
}
