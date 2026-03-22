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

export const OptionSchemas = createOptionSchemas(OptionMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof OptionSchemas.get>
export type GetAllInput = z.infer<typeof OptionSchemas.getAll>
export type CreateInput = z.infer<typeof OptionSchemas.create>
export type UpdateInput = z.infer<typeof OptionSchemas.update>
export type DeleteInput = z.infer<typeof OptionSchemas.delete>
