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
        menu_id: z.coerce.number(),
    }),
    getAll: z.object({
        menu_na: z.string().optional(),
        subsystem_id: z.number().int().optional().nullable(),
    }),
    create: z.object({
        menu_na: z.string().min(1, validation.name.required),
        subsystem_id: z.number().int().min(1, validation.subsystem.min).optional().nullable(),
    }),
    update: z.object({
        menu_id: z.coerce.number(),
        menu_na: z.string().optional(),
        subsystem_id: z.number().int().optional().nullable(),
    }),
    delete: z.object({
        menu_id: z.coerce.number(),
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
