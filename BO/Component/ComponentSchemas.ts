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
        item_id: z.coerce.number(),
    }),
    getAll: z.object({
        item_cod: z.coerce.number().optional(),
        item_na: z.string().optional(),
        category_id: z.coerce.number().optional(),
    }),
    create: z.object({
        item_cod: z.coerce.number().int().min(1, validation.code.min),
        item_na: z.string().min(1, validation.name.required),
        category_id: z.coerce.number().int().min(1, validation.category.min),
    }),
    update: z.object({
        item_id: z.coerce.number(),
        item_cod: z.coerce.number().int().optional(),
        item_na: z.string().optional(),
        category_id: z.coerce.number().int().optional(),
    }),
    delete: z.object({
        item_id: z.coerce.number(),
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
