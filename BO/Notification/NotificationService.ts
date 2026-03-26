import { BOService } from '@toproc/bo'
import type { IContainer, IWebSocketService } from '@toproc/types'
import { NotificationRepository, Errors, Types } from './NotificationModule.js'

/**
 * Capa de servicio para lógica de negocio de Notification.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./NotificationErrors.js
 */
export class NotificationService extends BOService implements Types.INotificationService {
    private repo: NotificationRepository
    private readonly websocket: IWebSocketService | null

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<NotificationRepository>('NotificationRepository')
        this.websocket = container.has('websocket')
            ? container.resolve<IWebSocketService>('websocket')
            : null
    }

    async getAll(filters: Types.GetAllNotificationInput = {}): Promise<Types.NotificationSummary[]> {
        return this.repo.findAll(filters)
    }

    /**
     * Obtiene notification por ID
     * @throws NotificationNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Notification> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.NotificationNotFoundError(id)
        }
        return entity
    }

    async create(data: Types.CreateNotificationInput): Promise<Types.Notification> {
        this.log.trace('Creando notification')
        const created = await this.repo.create(data)
        if (!created) {
            throw new Errors.NotificationValidationError(['No fue posible crear la notificación'])
        }

        this.websocket?.emitToUser(String(created.user_id), 'notification.created', {
            notification_id: created.notification_id,
            notification_ty: created.notification_ty,
            notification_tit: created.notification_tit,
            notification_dt: created.notification_dt,
            user_id: created.user_id,
        })

        return created
    }

    /**
     * Actualiza notification
     * @throws NotificationNotFoundError si no se encuentra
     */
    async update(id: number, data: Types.UpdateNotificationInput): Promise<Types.Notification> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.NotificationNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina notification
     * @throws NotificationNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.NotificationNotFoundError(id)
        }
        this.log.info('Eliminado notification ' + id)
    }
}
