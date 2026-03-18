import { z } from 'zod'
import { ComponentMessages } from './ComponentMessages.js'

/**
 * Schemas Zod para métodos de ComponentBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type ComponentMessagesSet = typeof ComponentMessages.es

export const createComponentSchemas = (messages: ComponentMessagesSet = ComponentMessages.es) => {
    const validation = messages.validation ?? ComponentMessages.es.validation

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

export const ComponentSchemas = createComponentSchemas(ComponentMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof ComponentSchemas.get>
export type GetAllInput = z.infer<typeof ComponentSchemas.getAll>
export type CreateInput = z.infer<typeof ComponentSchemas.create>
export type UpdateInput = z.infer<typeof ComponentSchemas.update>
export type DeleteInput = z.infer<typeof ComponentSchemas.delete>
