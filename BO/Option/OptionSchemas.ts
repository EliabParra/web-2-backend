import { z } from 'zod'
import { OptionMessages } from './OptionMessages.js'

/**
 * Schemas Zod para métodos de OptionBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type OptionMessagesSet = typeof OptionMessages.es

export const createOptionSchemas = (messages: OptionMessagesSet = OptionMessages.es) => {
    const validation = messages.validation ?? OptionMessages.es.validation

    return {
    get: z.object({
        option_id: z.coerce.number(),
    }),
    getAll: z.object({
        option_na: z.string().optional(),
        method_id: z.number().int().optional().nullable(),
    }),
    create: z.object({
        option_na: z.string().min(1, validation.name.required),
        method_id: z.number().int().min(1, validation.method.min).optional().nullable(),
    }),
    update: z.object({
        option_id: z.coerce.number(),
        option_na: z.string().optional(),
        method_id: z.number().int().optional().nullable(),
    }),
    delete: z.object({
        option_id: z.coerce.number(),
    }),
    }
}

export const OptionSchemas = createOptionSchemas(OptionMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof OptionSchemas.get>
export type GetAllInput = z.infer<typeof OptionSchemas.getAll>
export type CreateInput = z.infer<typeof OptionSchemas.create>
export type UpdateInput = z.infer<typeof OptionSchemas.update>
export type DeleteInput = z.infer<typeof OptionSchemas.delete>
