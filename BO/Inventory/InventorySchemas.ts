import { z } from 'zod'
import { InventoryMessages } from './InventoryMessages.js'

/**
 * Schemas Zod para métodos de InventoryBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type InventoryMessagesSet = typeof InventoryMessages.es

export const createInventorySchemas = (messages: InventoryMessagesSet = InventoryMessages.es) => {
    const validation = messages.validation ?? InventoryMessages.es.validation

    return {
    get: z.object({
        inventory_id: z.coerce.number(),
    }),
    getAll: z.object({
        item_id: z.coerce.number().int().optional(),
        location_id: z.coerce.number().int().optional(),
        category_type_id: z.coerce.number().int().optional(),
    }),
    create: z.object({
        item_id: z.coerce.number().int().min(1, validation.item.min),
        location_id: z.coerce.number().int().min(1, validation.location.min),
        inventory_qt: z.coerce.number().int().min(1, validation.quantity.min),
    }),
    update: z.object({
        inventory_id: z.coerce.number().int(),
        inventory_qt: z.coerce.number().int().min(0, validation.quantity.nonNegative).optional(),
        location_id: z.coerce.number().int().min(1, validation.location.min).optional(),
    }).refine(
        (data) => data.inventory_qt !== undefined || data.location_id !== undefined,
        {
            message: validation.atLeastOneField,
            path: ['inventory_qt'],
        }
    ),
    delete: z.object({
        inventory_id: z.coerce.number(),
    }),
    addStock: z.object({
        inventory_id: z.coerce.number().int(),
        quantity: z.coerce.number().int().min(1, validation.quantity.min),
    }),
    removeStock: z.object({
        inventory_id: z.coerce.number().int(),
        quantity: z.coerce.number().int().min(1, validation.quantity.min),
    }),
    moveLocation: z.object({
        inventory_id: z.coerce.number().int(),
        location_id: z.coerce.number().int().min(1, validation.location.min),
    }),
    }
}

export const InventorySchemas = createInventorySchemas(InventoryMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof InventorySchemas.get>
export type GetAllInput = z.infer<typeof InventorySchemas.getAll>
export type CreateInput = z.infer<typeof InventorySchemas.create>
export type UpdateInput = z.infer<typeof InventorySchemas.update>
export type DeleteInput = z.infer<typeof InventorySchemas.delete>
export type AddStockInput = z.infer<typeof InventorySchemas.addStock>
export type RemoveStockInput = z.infer<typeof InventorySchemas.removeStock>
export type MoveLocationInput = z.infer<typeof InventorySchemas.moveLocation>
