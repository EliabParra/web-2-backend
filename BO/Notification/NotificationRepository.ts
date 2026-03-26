import { IDatabase } from '@toproc/types'
import { NotificationQueries, Types } from './NotificationModule.js'

/**
 * Repositorio para operaciones de base de datos de NotificationBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class NotificationRepository implements Types.INotificationRepository {
    constructor(private readonly db: IDatabase) {}

    async findAll(filters: Types.GetAllNotificationInput = {}): Promise<Types.NotificationSummary[]> {
        const params = [
            filters.user_id ?? null,
            filters.notification_ty ?? null,
            filters.from_dt ?? null,
            filters.to_dt ?? null,
            filters.limit ?? 50,
            filters.offset ?? 0,
        ]
        const result = await this.db.query<Types.NotificationSummary>(NotificationQueries.findAll, params)
        return result.rows
    }

    async findById(id: number): Promise<Types.Notification | null> {
        const result = await this.db.query<Types.Notification>(NotificationQueries.findById, [id])
        return result.rows[0] ?? null
    }

    async create(data: Types.CreateNotificationInput): Promise<Types.Notification | null> {
        const result = await this.db.query<Types.Notification>(NotificationQueries.create, [
            data.notification_ty ?? null,
            data.notification_tit,
            data.notification_msg,
            data.user_id,
        ])
        return result.rows[0] ?? null
    }

    async update(id: number, data: Types.UpdateNotificationInput): Promise<Types.Notification | null> {
        const result = await this.db.query<Types.Notification>(NotificationQueries.update, [
            id,
            data.notification_ty ?? null,
            data.notification_tit ?? null,
            data.notification_msg ?? null,
        ])
        return result.rows[0] ?? null
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountNotification>(NotificationQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsNotification>(NotificationQueries.exists, [id])
        return result.rows[0].exists
    }
}
