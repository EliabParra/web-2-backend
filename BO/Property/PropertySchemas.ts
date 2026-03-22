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
        property_id: z.coerce.number(),
    }),
    getAll: z.object({
        property_de: z.string().optional(),
        property_val: z.coerce.number().int().optional(),
    }),
    create: z.object({
        property_de: z.string().min(1, validation.description.required),
        property_val: z.coerce.number().int(),
    }),
    update: z.object({
        property_id: z.coerce.number(),
        property_de: z.string().optional(),
        property_val: z.coerce.number().int().optional(),
    }),
    delete: z.object({
        property_id: z.coerce.number(),
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
