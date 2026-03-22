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

export const InventorySchemas = createInventorySchemas(InventoryMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof InventorySchemas.get>
export type GetAllInput = z.infer<typeof InventorySchemas.getAll>
export type CreateInput = z.infer<typeof InventorySchemas.create>
export type UpdateInput = z.infer<typeof InventorySchemas.update>
export type DeleteInput = z.infer<typeof InventorySchemas.delete>
