import { BOService, IContainer, IConfig, IDatabase } from '../../src/core/business-objects/index.js'
import type { ILogger } from '../../src/types/core.js'
import { NotificationRepository, Errors, Types } from './NotificationModule.js'

/**
 * Capa de servicio para lógica de negocio de Notification.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./NotificationErrors.js
 */
export class NotificationService extends BOService implements Types.INotificationService {
    private repo: NotificationRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<NotificationRepository>('NotificationRepository')
    }

    /**
     * Obtiene todos los notifications
     */
    async getAll(): Promise<Types.NotificationSummary[]> {
        return this.repo.findAll()
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

    /**
     * Crea nuevo notification
     */
    async create(data: Partial<Types.Notification>): Promise<Types.Notification> {
        this.log.info('Creando notification')
        return this.repo.create(data)
    }

    /**
     * Actualiza notification
     * @throws NotificationNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Notification>): Promise<Types.Notification> {
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
