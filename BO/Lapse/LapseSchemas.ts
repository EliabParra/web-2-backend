import { z } from 'zod'
import { LapseMessages } from './LapseMessages.js'

/**
 * Schemas Zod para métodos de LapseBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type LapseMessagesSet = typeof LapseMessages.es

export const createLapseSchemas = (messages: LapseMessagesSet = LapseMessages.es) => {
    const validation = messages.validation ?? LapseMessages.es.validation

    return {
    get: z.object({
        lapse_id: z.coerce.number(),
    }),
    getAll: z.object({
        lapse_de: z.string().optional(),
        lapse_act: z.coerce.boolean().optional().nullable(),
        lapse_start_dt: z.union([z.string(), z.date()]).optional().nullable(),
        lapse_close_dt: z.union([z.string(), z.date()]).optional().nullable(),
    }),
    create: z.object({
        lapse_de: z.string().min(1, validation.description.required),
        lapse_act: z.coerce.boolean().optional().nullable(),
        lapse_start_dt: z.union([z.string(), z.date()]).optional().nullable(),
        lapse_close_dt: z.union([z.string(), z.date()]).optional().nullable(),
    }),
    update: z.object({
        lapse_id: z.coerce.number(),
        lapse_de: z.string().optional(),
        lapse_act: z.coerce.boolean().optional().nullable(),
        lapse_start_dt: z.union([z.string(), z.date()]).optional().nullable(),
        lapse_close_dt: z.union([z.string(), z.date()]).optional().nullable(),
    }),
    delete: z.object({
        lapse_id: z.coerce.number(),
    }),
    }
}

export const LapseSchemas = createLapseSchemas(LapseMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof LapseSchemas.get>
export type GetAllInput = z.infer<typeof LapseSchemas.getAll>
export type CreateInput = z.infer<typeof LapseSchemas.create>
export type UpdateInput = z.infer<typeof LapseSchemas.update>
export type DeleteInput = z.infer<typeof LapseSchemas.delete>
