import { z } from 'zod'
import { EquipmentMessages } from './EquipmentMessages.js'

/**
 * Schemas Zod para métodos de EquipmentBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type EquipmentMessagesSet = typeof EquipmentMessages.es

export const createEquipmentSchemas = (messages: EquipmentMessagesSet = EquipmentMessages.es) => {
    const validation = messages.validation ?? EquipmentMessages.es.validation

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

export const EquipmentSchemas = createEquipmentSchemas(EquipmentMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof EquipmentSchemas.get>
export type GetAllInput = z.infer<typeof EquipmentSchemas.getAll>
export type CreateInput = z.infer<typeof EquipmentSchemas.create>
export type UpdateInput = z.infer<typeof EquipmentSchemas.update>
export type DeleteInput = z.infer<typeof EquipmentSchemas.delete>
