import { z } from 'zod'
import { DevolutionMessages } from './DevolutionMessages.js'

/**
 * Schemas Zod para métodos de DevolutionBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type DevolutionMessagesSet = typeof DevolutionMessages.es

export const createDevolutionSchemas = (messages: DevolutionMessagesSet = DevolutionMessages.es) => {
    const validation = messages.validation ?? DevolutionMessages.es.validation

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

export const DevolutionSchemas = createDevolutionSchemas(DevolutionMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof DevolutionSchemas.get>
export type GetAllInput = z.infer<typeof DevolutionSchemas.getAll>
export type CreateInput = z.infer<typeof DevolutionSchemas.create>
export type UpdateInput = z.infer<typeof DevolutionSchemas.update>
export type DeleteInput = z.infer<typeof DevolutionSchemas.delete>
