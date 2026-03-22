import { z } from 'zod'
import { SubsystemMessages } from './SubsystemMessages.js'

/**
 * Schemas Zod para métodos de SubsystemBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type SubsystemMessagesSet = typeof SubsystemMessages.es

export const createSubsystemSchemas = (messages: SubsystemMessagesSet = SubsystemMessages.es) => {
    const validation = messages.validation ?? SubsystemMessages.es.validation

    return {
    get: z.object({
        subsystem_id: z.coerce.number(),
    }),
    getAll: z.object({
        subsystem_na: z.string().optional(),
    }),
    create: z.object({
        subsystem_na: z.string().min(1, validation.name.required),
    }),
    update: z.object({
        subsystem_id: z.coerce.number(),
        subsystem_na: z.string().optional(),
    }),
    delete: z.object({
        subsystem_id: z.coerce.number(),
    }),
    }
}

export const SubsystemSchemas = createSubsystemSchemas(SubsystemMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof SubsystemSchemas.get>
export type GetAllInput = z.infer<typeof SubsystemSchemas.getAll>
export type CreateInput = z.infer<typeof SubsystemSchemas.create>
export type UpdateInput = z.infer<typeof SubsystemSchemas.update>
export type DeleteInput = z.infer<typeof SubsystemSchemas.delete>
