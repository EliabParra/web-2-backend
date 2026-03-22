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

export const LapseSchemas = createLapseSchemas(LapseMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof LapseSchemas.get>
export type GetAllInput = z.infer<typeof LapseSchemas.getAll>
export type CreateInput = z.infer<typeof LapseSchemas.create>
export type UpdateInput = z.infer<typeof LapseSchemas.update>
export type DeleteInput = z.infer<typeof LapseSchemas.delete>
