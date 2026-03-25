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

    private stockErrorPayload(err: unknown): { inventory_id?: number; requested?: number } {
        const message = err instanceof Error ? err.message : String(err)
        const matched = /^STOCK_INSUFFICIENT:(\d+):(\d+)$/.exec(message)
        if (!matched) return {}
        return {
            inventory_id: Number(matched[1]),
            requested: Number(matched[2]),
        }
    }

    async getMovementTypeIdByKeyword(keyword: string): Promise<number | null> {
        const result = await this.db.query<{ movement_type_id: number }>(
            LoanQueries.findMovementTypeIdByKeyword,
            [keyword]
        )
        return result.rows[0]?.movement_type_id ?? null
    }

    async getActiveLapseId(): Promise<number | null> {
        const result = await this.db.query<{ lapse_id: number }>(LoanQueries.findActiveLapseId, [])
        return result.rows[0]?.lapse_id ?? null
    }

    async findRequestById(movementId: number, requestTypeIds: number[]): Promise<Types.Request | null> {
        const result = await this.db.query<Types.Request>(LoanQueries.findRequestById, [
            movementId,
            requestTypeIds,
        ])
        return result.rows[0]
    }

    async findAllRequests(
        filters: Types.GetAllRequestsInput,
        requestTypeIds: number[]
    ): Promise<Types.RequestSummary[]> {
        const result = await this.db.query<Types.RequestSummary>(LoanQueries.findAllRequests, [
            requestTypeIds,
            filters.user_id ?? null,
            filters.lapse_id ?? null,
            filters.from_dt ?? null,
            filters.to_dt ?? null,
        ])
        return result.rows
    }

    async createRequest(
        data: Types.RequestLoanInput,
        requestTypeId: number,
        lapseId: number
    ): Promise<Types.Request> {
        const client = await this.db.pool.connect()
        try {
            await client.query('BEGIN')

            const result = await client.query<Types.Request>(LoanQueries.createRequest, [
                data.movement_ob,
                data.user_id,
                requestTypeId,
                lapseId,
            ])
            const request = result.rows[0]

            for (const detail of data.details) {
                await client.query(LoanQueries.insertMovementDetail, [
                    detail.inventory_id,
                    detail.movement_detail_am,
                    detail.movement_detail_ob ?? null,
                    request.movement_id,
                ])
            }

            await client.query('COMMIT')
            return request
        } catch (err: unknown) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
    }

    async acceptRequest(
        data: Types.AcceptRequestLoanInput,
        acceptedTypeId: number
    ): Promise<Types.Request | null> {
        const result = await this.db.query<Types.Request>(LoanQueries.acceptRequest, [
            data.movement_id,
            acceptedTypeId,
            data.movement_estimated_return_dt,
            data.movement_ob ?? null,
        ])
        return result.rows[0] ?? null
    }

    async rejectRequest(
        data: Types.RejectRequestLoanInput,
        rejectedTypeId: number
    ): Promise<Types.Request | null> {
        const result = await this.db.query<Types.Request>(LoanQueries.rejectRequest, [
            data.movement_id,
            rejectedTypeId,
            data.movement_ob,
        ])
        return result.rows[0] ?? null
    }

    async findLoanById(movementId: number, loanTypeId: number): Promise<Types.Loan | null> {
        const result = await this.db.query<Types.Loan>(LoanQueries.findLoanById, [
            movementId,
            loanTypeId,
        ])
        return result.rows[0] ?? null
    }

    async findAllLoans(filters: Types.GetAllLoansInput, loanTypeId: number): Promise<Types.LoanSummary[]> {
        const result = await this.db.query<Types.LoanSummary>(LoanQueries.findAllLoans, [
            loanTypeId,
            filters.user_id ?? null,
            filters.lapse_id ?? null,
            filters.from_dt ?? null,
            filters.to_dt ?? null,
        ])
        return result.rows
    }

    async findLoanDetails(movementId: number): Promise<Types.LoanDetailLine[]> {
        const result = await this.db.query<Types.LoanDetailLine>(LoanQueries.findLoanDetails, [movementId])
        return result.rows
    }

    async findInventoryById(inventoryId: number): Promise<Types.InventoryStockRow | null> {
        const result = await this.db.query<Types.InventoryStockRow>(LoanQueries.findInventoryById, [
            inventoryId,
        ])
        return result.rows[0] ?? null
    }

    async decreaseInventoryStock(inventoryId: number, amount: number): Promise<boolean> {
        const result = await this.db.query<{ inventory_id: number }>(LoanQueries.decreaseInventoryStock, [
            inventoryId,
            amount,
        ])
        return (result.rowCount ?? 0) > 0
    }

    async insertMovementDetail(
        movementId: number,
        detail: Types.RegisterLoanDetailInput
    ): Promise<Types.LoanDetailLine | null> {
        const result = await this.db.query<Types.LoanDetailLine>(LoanQueries.insertMovementDetail, [
            detail.inventory_id,
            detail.movement_detail_am,
            detail.movement_detail_ob ?? null,
            movementId,
        ])
        return result.rows[0] ?? null
    }

    async markMovementAsLoan(
        data: Types.RegisterLoanInput,
        loanTypeId: number
    ): Promise<Types.Loan | null> {
        const result = await this.db.query<Types.Loan>(LoanQueries.markMovementAsLoan, [
            data.movement_id,
            loanTypeId,
            data.movement_booking_dt ?? null,
            data.movement_ob ?? null,
        ])
        return result.rows[0] ?? null
    }

    async registerLoanAtomic(
        data: Types.RegisterLoanInput,
        loanTypeId: number
    ): Promise<{ movement: Types.Loan; details: Types.LoanDetailLine[] }> {
        const client = await this.db.pool.connect()
        try {
            await client.query('BEGIN')

            await client.query(LoanQueries.deleteMovementDetailsByMovementId, [data.movement_id])

            for (const detail of data.details ?? []) {
                const stockResult = await client.query<{ inventory_id: number }>(
                    LoanQueries.decreaseInventoryStock,
                    [detail.inventory_id, detail.movement_detail_am]
                )
                if ((stockResult.rowCount ?? 0) === 0) {
                    throw new Error(
                        `STOCK_INSUFFICIENT:${detail.inventory_id}:${detail.movement_detail_am}`
                    )
                }

                await client.query(LoanQueries.insertMovementDetail, [
                    detail.inventory_id,
                    detail.movement_detail_am,
                    detail.movement_detail_ob ?? null,
                    data.movement_id,
                ])
            }

            const movementResult = await client.query<Types.Loan>(LoanQueries.markMovementAsLoan, [
                data.movement_id,
                loanTypeId,
                data.movement_booking_dt ?? null,
                data.movement_ob ?? null,
            ])
            const movement = movementResult.rows[0] ?? null
            if (!movement) {
                throw new Error('MOVEMENT_NOT_FOUND')
            }

            const detailsResult = await client.query<Types.LoanDetailLine>(LoanQueries.findLoanDetails, [
                data.movement_id,
            ])

            await client.query('COMMIT')
            return {
                movement,
                details: detailsResult.rows,
            }
        } catch (err: unknown) {
            await client.query('ROLLBACK')
            const payload = this.stockErrorPayload(err)
            const wrapped = err instanceof Error ? err : new Error(String(err))
            Object.assign(wrapped, payload)
            throw wrapped
        } finally {
            client.release()
        }
    }
}
