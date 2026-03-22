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
        id: z.coerce.number(),
    }),
    getAll: z.object({
        // Parámetros de paginación o filtros opcionales
    }),
    create: z.object({
        // TODO: Definir validación. Usa messages.validation.xxx
    }),
    update: z.object({
        id: z.coerce.number(),
    }),
    delete: z.object({
        id: z.coerce.number(),
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
