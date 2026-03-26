import { BOService } from '@toproc/bo'
import type { IContainer, IWebSocketService } from '@toproc/types'
import { DevolutionRepository, Errors, Types } from './DevolutionModule.js'

/**
 * Capa de servicio para lógica de negocio de Devolution.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./DevolutionErrors.js
 */
export class DevolutionService extends BOService implements Types.IDevolutionService {
    private repo: DevolutionRepository
    private readonly LOAN_TYPE_ID = 4
    private readonly RETURNED_TYPE_ID = 5
    private readonly websocket: IWebSocketService | null

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<DevolutionRepository>('DevolutionRepository')
        this.websocket = container.has('websocket')
            ? container.resolve<IWebSocketService>('websocket')
            : null
    }

    /**
     * Obtiene todos los devolutions
     */
    async getAll(filters?: Types.GetAllDevolutionInput): Promise<Types.DevolutionSummary[]> {
        return this.repo.findAll(filters)
    }

    /**
     * Obtiene devolution por ID
     * @throws DevolutionNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Devolution> {
        const entity = await this.repo.findByMovementId(id)
        if (!entity) {
            throw new Errors.DevolutionNotFoundError(id)
        }
        return entity
    }

    async getDevolution(params: Types.GetOneDevolutionInput): Promise<Types.Devolution> {
        return this.getById(params.movement_id)
    }

    async getAllDevolutions(params: Types.GetAllDevolutionInput): Promise<Types.DevolutionSummary[]> {
        const rows = await this.repo.findAll(params)

        if (!params.status) return rows

        if (params.status === 'damaged') {
            return rows.filter((row) => row.damaged_items > 0)
        }

        if (params.status === 'completed') {
            return rows.filter((row) => row.pending_items === 0)
        }

        return rows.filter((row) => row.pending_items > 0)
    }

    async getUserDevolution(params: Types.GetUserDevolutionInput): Promise<Types.DevolutionSummary[]> {
        const rows = await this.repo.findByUserId(params.user_id, {
            from_dt: params.from_dt,
            to_dt: params.to_dt,
            status: params.status,
        })

        if (!params.status) return rows

        if (params.status === 'damaged') {
            return rows.filter((row) => row.damaged_items > 0)
        }

        if (params.status === 'completed') {
            return rows.filter((row) => row.pending_items === 0)
        }

        return rows.filter((row) => row.pending_items > 0)
    }

    async registerDevolution(params: Types.RegisterDevolutionInput): Promise<Types.Devolution> {
        this.log.trace(`Registrando devolución para movement_id=${params.movement_id}`)

        const movementTypeId = await this.repo.findMovementTypeByMovementId(params.movement_id)
        if (movementTypeId == null) {
            throw new Errors.DevolutionNotFoundError(params.movement_id)
        }

        if (movementTypeId !== this.LOAN_TYPE_ID && movementTypeId !== this.RETURNED_TYPE_ID) {
            throw new Errors.DevolutionValidationError([
                'El movimiento no está en estado prestado/devuelto y no admite devolución.',
            ])
        }

        const details = await this.repo.findMovementDetailsByMovementId(params.movement_id)
        if (details.length === 0) {
            throw new Errors.DevolutionValidationError([
                'El movimiento no tiene detalles para registrar devolución.',
            ])
        }

        const existing = await this.repo.hasDevolutionByMovementId(params.movement_id)
        if (existing) {
            throw new Errors.DevolutionAlreadyExistsError('movement_id', String(params.movement_id))
        }

        const detailMap = new Map(details.map((d) => [d.movement_detail_id, d]))
        const validationErrors: string[] = []

        for (const inputDetail of params.details) {
            const base = detailMap.get(inputDetail.movement_detail_id)
            if (!base) {
                validationErrors.push(
                    `movement_detail_id inválido: ${inputDetail.movement_detail_id}`
                )
                continue
            }

            const returnedAmount =
                inputDetail.returned_am != null ? inputDetail.returned_am : base.movement_detail_am

            if (returnedAmount < 0) {
                validationErrors.push(
                    `returned_am no puede ser negativo para movement_detail_id=${base.movement_detail_id}`
                )
            }

            if (returnedAmount > base.movement_detail_am) {
                validationErrors.push(
                    `returned_am excede la cantidad prestada para movement_detail_id=${base.movement_detail_id}`
                )
            }
        }

        if (validationErrors.length > 0) {
            throw new Errors.DevolutionValidationError(validationErrors)
        }

        await this.repo.registerAtomic(params)

        const entity = await this.repo.findByMovementId(params.movement_id)
        if (!entity) {
            throw new Errors.DevolutionNotFoundError(params.movement_id)
        }

        const notificationResult = await this.db.query<{
            notification_id: number
            notification_ty: string | null
            notification_tit: string | null
            notification_dt: string | Date
            user_id: number
        }>(
            `
            INSERT INTO business.notification (
                notification_ty,
                notification_tit,
                notification_msg,
                user_id
            )
            VALUES ($1, $2, $3, $4)
            RETURNING
                notification_id,
                notification_ty,
                notification_tit,
                notification_dt,
                user_id
            `,
            [
                'devolution',
                'Devolución registrada',
                `Se registró la devolución del movimiento #${entity.movement_id}.`,
                entity.user_id,
            ]
        )

        const createdNotification = notificationResult.rows[0] ?? null
        if (createdNotification) {
            this.websocket?.emitToUser(String(createdNotification.user_id), 'notification.created', {
                notification_id: createdNotification.notification_id,
                notification_ty: createdNotification.notification_ty,
                notification_tit: createdNotification.notification_tit,
                notification_dt: createdNotification.notification_dt,
                user_id: createdNotification.user_id,
            })
        }

        this.websocket?.emitToUser(String(entity.user_id), 'devolution.registered', {
            movement_id: entity.movement_id,
            user_id: entity.user_id,
            returned_items: entity.returned_items,
            pending_items: entity.pending_items,
            damaged_items: entity.damaged_items,
        })

        return entity
    }

    /**
     * Crea nuevo devolution
     */
    async create(data: Types.RegisterDevolutionInput): Promise<Types.Devolution> {
        return this.registerDevolution(data)
    }

    /**
     * Actualiza devolution
     * @throws DevolutionNotFoundError si no se encuentra
     */
    async update(id: number, data: Types.UpdateDevolutionInput): Promise<Types.Devolution> {
        const updated = await this.repo.update(id, data as unknown as Partial<Types.Devolution>)
        if (!updated) {
            throw new Errors.DevolutionNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina devolution
     * @throws DevolutionNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.DevolutionNotFoundError(id)
        }
        this.log.info('Eliminado devolution ' + id)
    }
}
