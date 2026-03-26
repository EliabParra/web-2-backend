/**
 * Definiciones de tipos para Notification
 */

export namespace Notification {
    export type Entity = {
        notification_id: number
        notification_ty?: string | null
        notification_tit?: string | null
        notification_msg?: string | null
        notification_dt: string | Date
        user_id: number
    }

    export type Summary = {
        notification_id: number
        notification_ty?: string | null
        notification_tit?: string | null
        notification_dt: string | Date
        user_id: number
    }

    export interface CreateInput {
        notification_ty?: string
        notification_tit: string
        notification_msg: string
        user_id: number
    }

    export interface UpdateInput {
        id: number
        notification_ty?: string
        notification_tit?: string
        notification_msg?: string
    }

    export interface GetInput {
        id: number
    }

    export interface GetAllInput {
        user_id?: number
        notification_ty?: string
        from_dt?: string | Date
        to_dt?: string | Date
        limit?: number
        offset?: number
    }

    export interface DeleteInput {
        id: number
    }

    export type RowCount = {
        rowCount: number
    }

    export type Exists = {
        exists: boolean
    }

    // ============================================================
    // Contratos (Service/Repository)
    // ============================================================

    export interface Repository {
        findAll(filters?: GetAllInput): Promise<Summary[]>
        findById(id: number): Promise<Entity | null>
        create(data: CreateInput): Promise<Entity | null>
        update(id: number, data: UpdateInput): Promise<Entity | null>
        delete(id: number): Promise<boolean>
        exists(id: number): Promise<boolean>
    }

    export interface Service {
        getAll(filters?: GetAllInput): Promise<Summary[]>
        getById(id: number): Promise<Entity>
        create(data: CreateInput): Promise<Entity>
        update(id: number, data: UpdateInput): Promise<Entity>
        delete(id: number): Promise<void>
    }
}

export type Notification = Notification.Entity
export type NotificationSummary = Notification.Summary
export type CreateNotificationInput = Notification.CreateInput
export type UpdateNotificationInput = Notification.UpdateInput
export type GetNotificationInput = Notification.GetInput
export type GetAllNotificationInput = Notification.GetAllInput
export type DeleteNotificationInput = Notification.DeleteInput

export type RowCountNotification = Notification.RowCount
export type ExistsNotification = Notification.Exists
export type INotificationRepository = Notification.Repository
export type INotificationService = Notification.Service
