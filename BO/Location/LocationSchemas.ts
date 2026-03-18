import { z } from 'zod'
import { LocationMessages } from './LocationMessages.js'

/**
 * Schemas Zod para métodos de LocationBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type LocationMessagesSet = typeof LocationMessages.es

export const createLocationSchemas = (messages: LocationMessagesSet = LocationMessages.es) => {
    const validation = messages.validation ?? LocationMessages.es.validation

    return {
        getAll: z.object({
            location_de: z.string().optional(),
            location_sh: z.coerce.number().optional(),
            location_dr: z.coerce.number().optional(),
        }),
        create: z.object({
            location_de: z.string().min(1, validation.description.required),
            location_sh: z.coerce.number().min(1, validation.shelf.min),
            location_dr: z.coerce.number().min(1, validation.drawer.min),
        }),
        update: z.object({
            location_id: z.coerce.number(),
            location_de: z.string().optional(),
            location_sh: z.coerce.number().optional(),
            location_dr: z.coerce.number().optional(),
        }),
        delete: z.object({
            location_id: z.coerce.number(),
        }),
        get: z.object({
            location_id: z.coerce.number(),
        }),
    }
}

export const LocationSchemas = createLocationSchemas(LocationMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetAllInput = z.infer<typeof LocationSchemas.getAll>
export type CreateInput = z.infer<typeof LocationSchemas.create>
export type UpdateInput = z.infer<typeof LocationSchemas.update>
export type DeleteInput = z.infer<typeof LocationSchemas.delete>
export type GetInput = z.infer<typeof LocationSchemas.get>
