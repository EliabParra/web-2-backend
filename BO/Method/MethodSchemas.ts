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
        method_id: z.coerce.number(),
    }),
    getAll: z.object({
        method_na: z.string().optional(),
    }),
    create: z.object({
        method_na: z.string().min(1, validation.name.required),
    }),
    update: z.object({
        method_id: z.coerce.number(),
        method_na: z.string().optional(),
    }),
    delete: z.object({
        method_id: z.coerce.number(),
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
