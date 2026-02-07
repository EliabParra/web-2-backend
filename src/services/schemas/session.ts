import { z } from 'zod'

export const LoginSchema = z.object({
    identifier: z.string().min(1, ''),
    password: z.string().min(1, 'Password is required'),
})

export const SessionUserSchema = z.object({
    user_id: z.number(),
    username: z.string(),
    user_email: z.string().email(),
    user_password: z.string(),
    user_email_verified_at: z.date().nullable().or(z.string().nullable()),
    profile_id: z.number(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type SessionUserRow = z.infer<typeof SessionUserSchema>
