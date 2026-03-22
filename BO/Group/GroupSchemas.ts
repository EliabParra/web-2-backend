import { z } from 'zod'
import { GroupMessages } from './GroupMessages.js'

/**
 * Schemas Zod para métodos de GroupBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type GroupMessagesSet = typeof GroupMessages.es

export const createGroupSchemas = (messages: GroupMessagesSet = GroupMessages.es) => {
    const validation = messages.validation ?? GroupMessages.es.validation

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

export const GroupSchemas = createGroupSchemas(GroupMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof GroupSchemas.get>
export type GetAllInput = z.infer<typeof GroupSchemas.getAll>
export type CreateInput = z.infer<typeof GroupSchemas.create>
export type UpdateInput = z.infer<typeof GroupSchemas.update>
export type DeleteInput = z.infer<typeof GroupSchemas.delete>
