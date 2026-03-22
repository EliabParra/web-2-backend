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

export const ProfileSchemas = createProfileSchemas(ProfileMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof ProfileSchemas.get>
export type GetAllInput = z.infer<typeof ProfileSchemas.getAll>
export type CreateInput = z.infer<typeof ProfileSchemas.create>
export type UpdateInput = z.infer<typeof ProfileSchemas.update>
export type DeleteInput = z.infer<typeof ProfileSchemas.delete>
