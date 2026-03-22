import { z } from 'zod'
import { ProfileMessages } from './ProfileMessages.js'

/**
 * Schemas Zod para métodos de ProfileBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type ProfileMessagesSet = typeof ProfileMessages.es

export const createProfileSchemas = (messages: ProfileMessagesSet = ProfileMessages.es) => {
    const validation = messages.validation ?? ProfileMessages.es.validation

    return {
    get: z.object({
        profile_id: z.coerce.number(),
    }),
    getAll: z.object({
        profile_na: z.string().optional(),
    }),
    create: z.object({
        profile_na: z.string().min(1, validation.name.required),
    }),
    update: z.object({
        profile_id: z.coerce.number(),
        profile_na: z.string().optional(),
    }),
    delete: z.object({
        profile_id: z.coerce.number(),
    }),
    }
}

export const ProfileSchemas = createProfileSchemas(ProfileMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof ProfileSchemas.get>
export type GetAllInput = z.infer<typeof ProfileSchemas.getAll>
export type CreateInput = z.infer<typeof ProfileSchemas.create>
export type UpdateInput = z.infer<typeof ProfileSchemas.update>
export type DeleteInput = z.infer<typeof ProfileSchemas.delete>
