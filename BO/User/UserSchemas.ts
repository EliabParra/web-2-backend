import { z } from 'zod'
import { UserMessages } from './UserMessages.js'

/**
 * Schemas Zod para métodos de UserBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type UserMessagesSet = typeof UserMessages.es

export const createUserSchemas = (messages: UserMessagesSet = UserMessages.es) => {
    const validation = messages.validation ?? UserMessages.es.validation

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

export const UserSchemas = createUserSchemas(UserMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof UserSchemas.get>
export type GetAllInput = z.infer<typeof UserSchemas.getAll>
export type CreateInput = z.infer<typeof UserSchemas.create>
export type UpdateInput = z.infer<typeof UserSchemas.update>
export type DeleteInput = z.infer<typeof UserSchemas.delete>
