import { IDatabase } from '../../src/core/business-objects/index.js'
import { NotificationQueries, Types } from './NotificationModule.js'

/**
 * Repositorio para operaciones de base de datos de NotificationBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class NotificationRepository implements Types.INotificationRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los notifications
     */
    async findAll(): Promise<Types.NotificationSummary[]> {
        const result = await this.db.query<Types.NotificationSummary>(NotificationQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca notification por ID
     */
    async findById(id: number): Promise<Types.Notification | null> {
        const result = await this.db.query<Types.Notification>(NotificationQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo notification
     */
    async create(data: Partial<Types.Notification>): Promise<Types.Notification> {
        const result = await this.db.query<Types.Notification>(NotificationQueries.create, [
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Actualiza notification
     */
    async update(id: number, data: Partial<Types.Notification>): Promise<Types.Notification | null> {
        const result = await this.db.query<Types.Notification>(NotificationQueries.update, [
            id,
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Elimina notification
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountNotification>(NotificationQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si notification existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsNotification>(NotificationQueries.exists, [id])
        return result.rows[0].exists
    }
}
