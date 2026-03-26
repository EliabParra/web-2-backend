import { z } from 'zod'
import { DevolutionMessages } from './DevolutionMessages.js'
import { normalizeDateTimeInput } from '@toproc/utils'

/**
 * Schemas Zod para métodos de DevolutionBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type DevolutionMessagesSet = typeof DevolutionMessages.es

export const createDevolutionSchemas = (messages: DevolutionMessagesSet = DevolutionMessages.es) => {
    const validation = messages.validation ?? DevolutionMessages.es.validation
    const dateTimeInput = z.union([z.string(), z.date()]).transform((value, ctx) => {
        const normalized = normalizeDateTimeInput(value)
        if (!normalized) {
            ctx.addIssue({
                code: 'custom',
                message: validation.invalidFormat,
            })
            return z.NEVER
        }
        return normalized
    })

    return {
    get: z.object({
        id: z.coerce.number(),
    }),
    getAll: z.object({
        user_id: z.coerce.number().int().optional(),
        lapse_id: z.coerce.number().int().optional(),
        from_dt: dateTimeInput.optional(),
        to_dt: dateTimeInput.optional(),
        status: z.enum(['partial', 'completed', 'damaged']).optional(),
    }),
    create: z.object({
        movement_id: z.coerce.number().int().positive(),
        devolution_ob: z.string().optional(),
        actor_user_id: z.coerce.number().int().optional(),
        details: z.array(
            z.object({
                movement_detail_id: z.coerce.number().int().positive(),
                returned_am: z.coerce.number().int().min(0).optional(),
                condition: z.enum(['good', 'damaged', 'partial']).optional(),
                damage_ob: z.string().optional(),
            })
        ).min(1, validation.requiredField),
    }),
    update: z.object({
        id: z.coerce.number(),
        movement_ob: z.string().optional(),
    }),
    delete: z.object({
        id: z.coerce.number(),
    }),
    getDevolution: z.object({
        movement_id: z.coerce.number().int().positive(),
    }),
    getAllDevolutions: z.object({
        user_id: z.coerce.number().int().optional(),
        lapse_id: z.coerce.number().int().optional(),
        from_dt: dateTimeInput.optional(),
        to_dt: dateTimeInput.optional(),
        status: z.enum(['partial', 'completed', 'damaged']).optional(),
    }),
    getUserDevolution: z.object({
        user_id: z.coerce.number().int().positive(),
        from_dt: dateTimeInput.optional(),
        to_dt: dateTimeInput.optional(),
        status: z.enum(['partial', 'completed', 'damaged']).optional(),
    }),
    registerDevolution: z.object({
        movement_id: z.coerce.number().int().positive(),
        devolution_ob: z.string().optional(),
        actor_user_id: z.coerce.number().int().optional(),
        details: z.array(
            z.object({
                movement_detail_id: z.coerce.number().int().positive(),
                returned_am: z.coerce.number().int().min(0).optional(),
                condition: z.enum(['good', 'damaged', 'partial']).optional(),
                damage_ob: z.string().optional(),
            })
        ).min(1, validation.requiredField),
    }),
    }
}

export const DevolutionSchemas = createDevolutionSchemas(DevolutionMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof DevolutionSchemas.get>
export type GetAllInput = z.infer<typeof DevolutionSchemas.getAll>
export type CreateInput = z.infer<typeof DevolutionSchemas.create>
export type UpdateInput = z.infer<typeof DevolutionSchemas.update>
export type DeleteInput = z.infer<typeof DevolutionSchemas.delete>
export type GetDevolutionInput = z.infer<typeof DevolutionSchemas.getDevolution>
export type GetAllDevolutionsInput = z.infer<typeof DevolutionSchemas.getAllDevolutions>
export type GetUserDevolutionInput = z.infer<typeof DevolutionSchemas.getUserDevolution>
export type RegisterDevolutionInput = z.infer<typeof DevolutionSchemas.registerDevolution>
