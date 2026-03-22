import { z } from 'zod'
import { PropertyMessages } from './PropertyMessages.js'

/**
 * Schemas Zod para métodos de PropertyBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type PropertyMessagesSet = typeof PropertyMessages.es

export const createPropertySchemas = (messages: PropertyMessagesSet = PropertyMessages.es) => {
    const validation = messages.validation ?? PropertyMessages.es.validation

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

export const PropertySchemas = createPropertySchemas(PropertyMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof PropertySchemas.get>
export type GetAllInput = z.infer<typeof PropertySchemas.getAll>
export type CreateInput = z.infer<typeof PropertySchemas.create>
export type UpdateInput = z.infer<typeof PropertySchemas.update>
export type DeleteInput = z.infer<typeof PropertySchemas.delete>
