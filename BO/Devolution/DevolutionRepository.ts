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
    async findAll(filters?: Types.GetAllDevolutionInput): Promise<Types.DevolutionSummary[]> {
        const result = await this.db.query<Types.DevolutionSummary>(DevolutionQueries.findAll, [
            filters?.user_id ?? null,
            filters?.lapse_id ?? null,
            filters?.from_dt ?? null,
            filters?.to_dt ?? null,
        ])
        return result.rows
    }

    /**
     * Busca devolution por ID
     */
    async findByMovementId(movementId: number): Promise<Types.Devolution | null> {
        const result = await this.db.query<Types.Devolution>(DevolutionQueries.findById, [movementId])
        const base = result.rows[0]
        if (!base) return null

        const detailResult = await this.db.query<Types.DevolutionDetail>(
            DevolutionQueries.findDetailsWithLatestStatusByMovementId,
            [movementId]
        )

        return {
            ...base,
            details: detailResult.rows,
        }
    }

    async findByUserId(
        userId: number,
        filters?: Omit<Types.GetUserDevolutionInput, 'user_id'>
    ): Promise<Types.DevolutionSummary[]> {
        const result = await this.db.query<Types.DevolutionSummary>(DevolutionQueries.findAll, [
            userId,
            null,
            filters?.from_dt ?? null,
            filters?.to_dt ?? null,
        ])
        return result.rows
    }

    async findMovementTypeByMovementId(movementId: number): Promise<number | null> {
        const result = await this.db.query<Types.MovementTypeCheck>(
            DevolutionQueries.findMovementTypeByMovementId,
            [movementId]
        )
        return result.rows[0]?.movement_type_id ?? null
    }

    async findMovementDetailsByMovementId(
        movementId: number
    ): Promise<Types.MovementDetailBase[]> {
        const result = await this.db.query<Types.MovementDetailBase>(
            DevolutionQueries.findMovementDetailsByMovementId,
            [movementId]
        )
        return result.rows
    }

    async hasDevolutionByMovementId(movementId: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsDevolution>(DevolutionQueries.exists, [movementId])
        return result.rows[0]?.exists ?? false
    }

    async registerAtomic(data: Types.RegisterDevolutionInput): Promise<Types.RegisterDevolutionResult> {
        const client = await this.db.pool.connect()
        try {
            await client.query('BEGIN')

            let allReturned = true
            const baseDetailsRes = await client.query<Types.MovementDetailBase>(
                DevolutionQueries.findMovementDetailsByMovementId,
                [data.movement_id]
            )
            const baseDetailsById = new Map<number, Types.MovementDetailBase>(
                baseDetailsRes.rows.map((row) => [row.movement_detail_id, row])
            )

            for (const detail of data.details) {
                const baseDetail = baseDetailsById.get(detail.movement_detail_id)

                if (!baseDetail) {
                    throw new Error(`DETAIL_NOT_FOUND:${detail.movement_detail_id}`)
                }

                const returnedAmount =
                    detail.returned_am != null ? detail.returned_am : baseDetail.movement_detail_am

                if (returnedAmount < baseDetail.movement_detail_am) {
                    allReturned = false
                }

                const statusDe =
                    detail.condition === 'damaged' || Boolean(detail.damage_ob)
                        ? 'damaged'
                        : returnedAmount >= baseDetail.movement_detail_am
                            ? 'returned'
                            : 'partial'

                const statusPayload = JSON.stringify({
                    returned_am: returnedAmount,
                    requested_am: baseDetail.movement_detail_am,
                    actor_user_id: data.actor_user_id ?? null,
                    note: data.devolution_ob ?? null,
                    condition: detail.condition ?? null,
                    damage_ob: detail.damage_ob ?? null,
                })

                await client.query(DevolutionQueries.create, [
                    new Date().toISOString(),
                    statusDe,
                    statusPayload,
                    detail.movement_detail_id,
                ])

                if (returnedAmount > 0) {
                    await client.query(DevolutionQueries.increaseInventoryStock, [
                        baseDetail.inventory_id,
                        returnedAmount,
                    ])
                }
            }

            if (allReturned) {
                await client.query(DevolutionQueries.markMovementAsReturned, [
                    data.movement_id,
                    data.devolution_ob ?? null,
                ])
            }

            await client.query('COMMIT')

            return {
                movement_id: data.movement_id,
                allReturned,
            }
        } catch (err: unknown) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
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

    // Métodos de compatibilidad temporal con la interfaz anterior
    async findById(id: number): Promise<Types.Devolution | null> {
        return this.findByMovementId(id)
    }

    async create(data: Partial<Types.Devolution>): Promise<Types.Devolution> {
        const movementId = Number((data as unknown as { movement_id?: number }).movement_id)
        if (!Number.isInteger(movementId) || movementId <= 0) {
            throw new Error('INVALID_MOVEMENT_ID')
        }
        const entity = await this.findByMovementId(movementId)
        if (!entity) {
            throw new Error('DEVOLUTION_NOT_FOUND')
        }
        return entity
    }

    async update(id: number, data: Partial<Types.Devolution>): Promise<Types.Devolution | null> {
        await this.db.query(DevolutionQueries.update, [
            id,
            (data as unknown as { movement_ob?: string }).movement_ob ?? null,
        ])
        return this.findByMovementId(id)
    }
}
