import { z } from 'zod'
import { ObjectMessages } from './ObjectMessages.js'

/**
 * Schemas Zod para métodos de ObjectBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type ObjectMessagesSet = typeof ObjectMessages.es

export const createObjectSchemas = (messages: ObjectMessagesSet = ObjectMessages.es) => {
    const validation = messages.validation ?? ObjectMessages.es.validation

    return {
    get: z.object({
        object_id: z.coerce.number(),
    }),
    getAll: z.object({
        object_na: z.string().optional(),
    }),
    create: z.object({
        object_na: z.string().min(1, validation.name.required),
    }),
    update: z.object({
        object_id: z.coerce.number(),
        object_na: z.string().optional(),
    }),
    delete: z.object({
        object_id: z.coerce.number(),
    }),
    }
}

export const ObjectSchemas = createObjectSchemas(ObjectMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof ObjectSchemas.get>
export type GetAllInput = z.infer<typeof ObjectSchemas.getAll>
export type CreateInput = z.infer<typeof ObjectSchemas.create>
export type UpdateInput = z.infer<typeof ObjectSchemas.update>
export type DeleteInput = z.infer<typeof ObjectSchemas.delete>
