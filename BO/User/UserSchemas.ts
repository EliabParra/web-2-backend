import { z } from 'zod'
import { UserMessages } from './UserMessages.js'

/**
 * Schemas Zod para métodos de UserBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type UserMessagesSet = typeof UserMessages.es

export const createUserSchemas = (messages: UserMessagesSet = UserMessages.es) => {
    const validation = messages.validation ?? UserMessages.es.validation

    return {
    get: z.object({
        user_id: z.coerce.number(),
    }),
    getAll: z.object({
        user_na: z.string().optional(),
        user_em: z.string().optional(),
        user_act: z.coerce.boolean().optional(),
        person_na: z.string().optional(),
    }),
    create: z.object({
        user_na: z.string().min(1, validation.username.required),
        user_pw: z.string().min(1, validation.password.required),
        user_act: z.coerce.boolean().optional(),
        user_em: z.email(validation.email.invalid).optional().nullable(),
        user_em_verified_dt: z.union([z.string(), z.date()]).optional().nullable(),
        user_sol: z.coerce.boolean().optional().nullable(),
        person_ci: z.string().optional().nullable(),
        person_na: z.string().optional().nullable(),
        person_ln: z.string().optional().nullable(),
        person_ph: z.string().optional().nullable(),
        person_deg: z.string().optional().nullable(),
    }),
    update: z.object({
        user_id: z.coerce.number(),
        user_na: z.string().optional(),
        user_pw: z.string().optional(),
        user_act: z.coerce.boolean().optional(),
        user_em: z.email(validation.email.invalid).optional().nullable(),
        user_em_verified_dt: z.union([z.string(), z.date()]).optional().nullable(),
        user_sol: z.coerce.boolean().optional().nullable(),
        person_ci: z.string().optional().nullable(),
        person_na: z.string().optional().nullable(),
        person_ln: z.string().optional().nullable(),
        person_ph: z.string().optional().nullable(),
        person_deg: z.string().optional().nullable(),
    }),
    delete: z.object({
        user_id: z.coerce.number(),
    }),
    }
}

export const UserSchemas = createUserSchemas(UserMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof UserSchemas.get>
export type GetAllInput = z.infer<typeof UserSchemas.getAll>
export type CreateInput = z.infer<typeof UserSchemas.create>
export type UpdateInput = z.infer<typeof UserSchemas.update>
export type DeleteInput = z.infer<typeof UserSchemas.delete>
