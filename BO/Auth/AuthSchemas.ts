import { z } from 'zod'
import { AuthMessages } from './AuthMessages.js'

export type AuthMessagesSet = typeof AuthMessages.es

export const createAuthSchemas = (messages: AuthMessagesSet = AuthMessages.es) => {
    const validation = messages.validation ?? AuthMessages.es.validation

    return {
        login: z.object({
            identifier: z.string().min(1, validation.loginIdRequired),
            password: z.string().min(1, validation.passwordRequired),
        }),

        register: z.object({
            email: z.email(validation.emailInvalid),
            password: z.string().min(8, validation.passwordTooShort),
            user_na: z.string().min(1, validation.usernameRequired).optional(),
            person_ci: z.string().optional().nullable(),
            person_na: z.string().optional().nullable(),
            person_ln: z.string().optional().nullable(),
            person_ph: z.string().optional().nullable(),
            person_deg: z.string().optional().nullable(),
            name: z.string().optional(),
        }),

        logout: z.object({
            sessionId: z.string().optional(),
        }),

        verifyEmail: z.object({
            code: z.string().length(6, validation.codeRequired),
        }),

        requestEmailVerification: z.object({
            identifier: z.string().min(1, validation.emailRequired),
        }),

        requestResetPassword: z.object({
            email: z.email(validation.emailInvalid),
        }),

        verifyPasswordReset: z.object({
            token: z.string().min(1, validation.tokenRequired),
        }),

        resetPasswordConfirm: z.object({
            token: z.string().min(1, validation.tokenRequired),
            newPassword: z.string().min(8, validation.passwordTooShort),
        }),

        changePassword: z.object({
            currentPassword: z.string().min(1, validation.passwordRequired),
            newPassword: z.string().min(8, validation.passwordTooShort),
        }),

        requestUsername: z.object({
            email: z.email(validation.emailInvalid),
        }),
    }
}

export const AuthSchemas = createAuthSchemas(AuthMessages.es)

export type LoginInput = z.infer<typeof AuthSchemas.login>
export type RegisterInput = z.infer<typeof AuthSchemas.register>
export type LogoutInput = z.infer<typeof AuthSchemas.logout>
export type VerifyEmailInput = z.infer<typeof AuthSchemas.verifyEmail>
export type RequestEmailVerificationInput = z.infer<typeof AuthSchemas.requestEmailVerification>
export type RequestPasswordResetInput = z.infer<typeof AuthSchemas.requestResetPassword>
export type VerifyPasswordResetInput = z.infer<typeof AuthSchemas.verifyPasswordReset>
export type ResetPasswordConfirmInput = z.infer<typeof AuthSchemas.resetPasswordConfirm>
export type ChangePasswordInput = z.infer<typeof AuthSchemas.changePassword>
export type RequestUsernameInput = z.infer<typeof AuthSchemas.requestUsername>
