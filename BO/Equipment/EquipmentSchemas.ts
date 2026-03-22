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

export const EquipmentSchemas = createEquipmentSchemas(EquipmentMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof EquipmentSchemas.get>
export type GetAllInput = z.infer<typeof EquipmentSchemas.getAll>
export type CreateInput = z.infer<typeof EquipmentSchemas.create>
export type UpdateInput = z.infer<typeof EquipmentSchemas.update>
export type DeleteInput = z.infer<typeof EquipmentSchemas.delete>
