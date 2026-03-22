import { z } from 'zod'
import { MethodMessages } from './MethodMessages.js'

/**
 * Schemas Zod para métodos de MethodBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type MethodMessagesSet = typeof MethodMessages.es

export const createMethodSchemas = (messages: MethodMessagesSet = MethodMessages.es) => {
    const validation = messages.validation ?? MethodMessages.es.validation

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

export const MethodSchemas = createMethodSchemas(MethodMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof MethodSchemas.get>
export type GetAllInput = z.infer<typeof MethodSchemas.getAll>
export type CreateInput = z.infer<typeof MethodSchemas.create>
export type UpdateInput = z.infer<typeof MethodSchemas.update>
export type DeleteInput = z.infer<typeof MethodSchemas.delete>
