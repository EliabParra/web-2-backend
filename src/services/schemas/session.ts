import { z } from 'zod'

export const LoginSchema = z.object({
    identifier: z.string().min(1, ''),
    password: z.string().min(1, 'Password is required'),
})

// TODO(REVERT_NAMING): Revert user_na to username, user_em to user_email, user_pw to user_password, user_em_verified_dt to user_email_verified_at
export const SessionUserSchema = z.object({
    user_id: z.number(),
    user_na: z.string(),
    user_em: z.email(),
    user_pw: z.string(),
    user_em_verified_dt: z.date().nullable().or(z.string().nullable()),
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    profile_ids: z.array(z.number()).default([]),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type SessionUserRow = z.infer<typeof SessionUserSchema>
