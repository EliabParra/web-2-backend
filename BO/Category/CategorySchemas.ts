import { z } from 'zod'
import { CategoryMessages } from './CategoryMessages.js'

/**
 * Schemas Zod para métodos de CategoryBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type CategoryMessagesSet = typeof CategoryMessages.es

export const createCategorySchemas = (messages: CategoryMessagesSet = CategoryMessages.es) => {
    const validation = messages.validation ?? CategoryMessages.es.validation

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

export const CategorySchemas = createCategorySchemas(CategoryMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof CategorySchemas.get>
export type GetAllInput = z.infer<typeof CategorySchemas.getAll>
export type CreateInput = z.infer<typeof CategorySchemas.create>
export type UpdateInput = z.infer<typeof CategorySchemas.update>
export type DeleteInput = z.infer<typeof CategorySchemas.delete>
