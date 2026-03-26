import { z } from 'zod'
import { NotificationMessages } from './NotificationMessages.js'

/**
 * Schemas Zod para métodos de NotificationBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type NotificationMessagesSet = typeof NotificationMessages.es

export const createNotificationSchemas = (messages: NotificationMessagesSet = NotificationMessages.es) => {
    const validation = messages.validation ?? NotificationMessages.es.validation

    return {
        get: z.object({
            id: z.coerce.number().int().positive(),
        }),
        getAll: z.object({
            user_id: z.coerce.number().int().positive().optional(),
            notification_ty: z.string().trim().min(1).max(60).optional(),
            from_dt: z.coerce.date().optional(),
            to_dt: z.coerce.date().optional(),
            limit: z.coerce.number().int().min(1).max(200).default(50),
            offset: z.coerce.number().int().min(0).default(0),
        }),
        create: z.object({
            notification_ty: z.string().trim().min(1).max(60).optional(),
            notification_tit: z
                .string({ message: validation.requiredField })
                .trim()
                .min(1, validation.requiredField)
                .max(200),
            notification_msg: z
                .string({ message: validation.requiredField })
                .trim()
                .min(1, validation.requiredField)
                .max(2000),
            user_id: z.coerce.number().int().positive(),
        }),
        update: z
            .object({
                id: z.coerce.number().int().positive(),
                notification_ty: z.string().trim().min(1).max(60).optional(),
                notification_tit: z.string().trim().min(1).max(200).optional(),
                notification_msg: z.string().trim().min(1).max(2000).optional(),
            })
            .refine(
                (data) =>
                    data.notification_ty !== undefined ||
                    data.notification_tit !== undefined ||
                    data.notification_msg !== undefined,
                { message: validation.requiredField }
            ),
        delete: z.object({
            id: z.coerce.number().int().positive(),
        }),
    }
}

export const NotificationSchemas = createNotificationSchemas(NotificationMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof NotificationSchemas.get>
export type GetAllInput = z.infer<typeof NotificationSchemas.getAll>
export type CreateInput = z.infer<typeof NotificationSchemas.create>
export type UpdateInput = z.infer<typeof NotificationSchemas.update>
export type DeleteInput = z.infer<typeof NotificationSchemas.delete>
