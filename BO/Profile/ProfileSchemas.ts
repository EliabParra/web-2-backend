import { z } from 'zod'
import { ProfileMessages } from './ProfileMessages.js'

/**
 * Schemas Zod para métodos de ProfileBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type ProfileMessagesSet = typeof ProfileMessages.es

export const createProfileSchemas = (messages: ProfileMessagesSet = ProfileMessages.es) => {
    const validation = messages.validation ?? ProfileMessages.es.validation

    return {
    get: z.object({
        profile_id: z.coerce.number(),
    }),
    getAll: z.object({
        profile_na: z.string().optional(),
    }),
    create: z.object({
        profile_na: z.string().min(1, validation.name.required),
    }),
    update: z.object({
        profile_id: z.coerce.number(),
        profile_na: z.string().optional(),
    }),
    delete: z.object({
        profile_id: z.coerce.number(),
    }),
    grantPermission: z.object({
        profile_id: z.coerce.number().int().positive(),
        object_na: z.string().min(1),
        method_na: z.string().min(1),
    }),
    revokePermission: z.object({
        profile_id: z.coerce.number().int().positive(),
        object_na: z.string().min(1),
        method_na: z.string().min(1),
    }),
    assignSubsystem: z.object({
        profile_id: z.coerce.number().int().positive(),
        subsystem_id: z.coerce.number().int().positive(),
    }),
    revokeSubsystem: z.object({
        profile_id: z.coerce.number().int().positive(),
        subsystem_id: z.coerce.number().int().positive(),
    }),
    assignMenu: z.object({
        profile_id: z.coerce.number().int().positive(),
        menu_id: z.coerce.number().int().positive(),
    }),
    revokeMenu: z.object({
        profile_id: z.coerce.number().int().positive(),
        menu_id: z.coerce.number().int().positive(),
    }),
    assignOption: z.object({
        profile_id: z.coerce.number().int().positive(),
        option_id: z.coerce.number().int().positive(),
    }),
    revokeOption: z.object({
        profile_id: z.coerce.number().int().positive(),
        option_id: z.coerce.number().int().positive(),
    }),
    }
}

export const ProfileSchemas = createProfileSchemas(ProfileMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof ProfileSchemas.get>
export type GetAllInput = z.infer<typeof ProfileSchemas.getAll>
export type CreateInput = z.infer<typeof ProfileSchemas.create>
export type UpdateInput = z.infer<typeof ProfileSchemas.update>
export type DeleteInput = z.infer<typeof ProfileSchemas.delete>
export type GrantPermissionInput = z.infer<typeof ProfileSchemas.grantPermission>
export type RevokePermissionInput = z.infer<typeof ProfileSchemas.revokePermission>
export type AssignSubsystemInput = z.infer<typeof ProfileSchemas.assignSubsystem>
export type RevokeSubsystemInput = z.infer<typeof ProfileSchemas.revokeSubsystem>
export type AssignMenuInput = z.infer<typeof ProfileSchemas.assignMenu>
export type RevokeMenuInput = z.infer<typeof ProfileSchemas.revokeMenu>
export type AssignOptionInput = z.infer<typeof ProfileSchemas.assignOption>
export type RevokeOptionInput = z.infer<typeof ProfileSchemas.revokeOption>
