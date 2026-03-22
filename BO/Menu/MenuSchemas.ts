import { z } from 'zod'
import { MenuMessages } from './MenuMessages.js'

/**
 * Schemas Zod para métodos de MenuBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type MenuMessagesSet = typeof MenuMessages.es

export const createMenuSchemas = (messages: MenuMessagesSet = MenuMessages.es) => {
    const validation = messages.validation ?? MenuMessages.es.validation

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

export const MenuSchemas = createMenuSchemas(MenuMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof MenuSchemas.get>
export type GetAllInput = z.infer<typeof MenuSchemas.getAll>
export type CreateInput = z.infer<typeof MenuSchemas.create>
export type UpdateInput = z.infer<typeof MenuSchemas.update>
export type DeleteInput = z.infer<typeof MenuSchemas.delete>
