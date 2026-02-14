/**
 * AuthPreset - Plantillas para módulo de autenticación
 *
 * Genera la estructura de 9 archivos con nomenclatura Name.Type.ts:
 * - AuthBO.ts
 * - AuthService.ts
 * - AuthRepository.ts
 * - AuthSchemas.ts
 * - AuthTypes.ts
 * - AuthMessages.ts
 * - AuthErrors.ts
 * - AuthQueries.ts
 * - AuthModule.ts
 */

export const AuthPreset = {
    // Definición de métodos para la CLI
    methods: () => [
        'register',
        'requestEmailVerification',
        'verifyEmail',
        'requestPasswordReset',
        'verifyPasswordReset',
        'resetPassword',
        'requestUsername',
    ],

    // ============================================================
    // Plantillas
    // ============================================================

    bo: () => `import { BaseBO, ApiResponse, IContainer } from '../../src/core/business-objects/index.js'
import { AuthService, AuthMessages, AuthSchemas, Inputs, registerAuth } from './AuthModule.js'

export class AuthBO extends BaseBO {
    private service: AuthService

    constructor(container: IContainer) {
        super(container)
        registerAuth(container)
        this.service = container.resolve<AuthService>('AuthService')
    }

    private get authMessages() {
        return this.i18n.use(AuthMessages)
    }

    async register(params: Inputs.RegisterInput): Promise<ApiResponse> {
        return this.exec<Inputs.RegisterInput, void>(params, AuthSchemas.register, async (data) => {
            await this.service.register(data)
            return this.created(null, this.authMessages.registerSuccess)
        })
    }

    async verifyEmail(params: Inputs.VerifyEmailInput): Promise<ApiResponse> {
        return this.exec<Inputs.VerifyEmailInput, void>(params, AuthSchemas.verifyEmail, async (data) => {
            await this.service.verifyEmail(data.token)
            return this.success(null, this.authMessages.emailVerified)
        })
    }

    async requestEmailVerification(params: Inputs.RequestEmailVerificationInput): Promise<ApiResponse> {
        return this.exec<Inputs.RequestEmailVerificationInput, void>(
            params,
            AuthSchemas.requestEmailVerification,
            async (data) => {
                await this.service.requestEmailVerification(data.identifier)
                return this.success(
                    null,
                    this.i18n.format(this.authMessages.verificationSentTo, {
                        email: data.identifier,
                    })
                )
            }
        )
    }

    async requestPasswordReset(params: Inputs.RequestPasswordResetInput): Promise<ApiResponse> {
        return this.exec<Inputs.RequestPasswordResetInput, void>(
            params,
            AuthSchemas.requestResetPassword,
            async (data) => {
                await this.service.requestPasswordReset(data.email)
                return this.success(null, this.authMessages.passwordResetSent)
            }
        )
    }

    async verifyPasswordReset(params: Inputs.VerifyPasswordResetInput): Promise<ApiResponse> {
        return this.exec<Inputs.VerifyPasswordResetInput, void>(
            params,
            AuthSchemas.verifyPasswordReset,
            async (data) => {
                // Just verification of token existence/validity
                await this.service.verifyPasswordResetToken(data.token)
                return this.success(null, this.authMessages.tokenValid)
            }
        )
    }

    async resetPassword(params: Inputs.ResetPasswordConfirmInput): Promise<ApiResponse> {
        return this.exec<Inputs.ResetPasswordConfirmInput, void>(
            params,
            AuthSchemas.resetPasswordConfirm,
            async (data) => {
                await this.service.resetPassword(data.token, data.newPassword)
                return this.success(null, this.authMessages.passwordChanged)
            }
        )
    }

    async requestUsername(params: Inputs.RequestUsernameInput): Promise<ApiResponse> {
        return this.exec<Inputs.RequestUsernameInput, void>(
            params,
            AuthSchemas.requestUsername,
            async (data) => {
                await this.service.requestUsername(data.email)
                return this.success(null, this.i18n.format(this.authMessages.usernameSent, {
                    email: data.email,
                }))
            }
        )
    }
}

`,

    service:
        () => `import { BOService, II18nService, IEmailService, IContainer } from '../../src/core/business-objects/index.js'
import { AuthRepository, AuthMessages, Errors, Types } from './AuthModule.js'
import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

function sha256Hex(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex')
}

export class AuthService extends BOService implements Types.IAuthService {
    private repo: AuthRepository
    private i18n: II18nService
    private email: IEmailService

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<AuthRepository>('AuthRepository')
        this.i18n = container.resolve<II18nService>('i18n')
        this.email = container.resolve<IEmailService>('email')
    }

    private get messages() {
        return this.i18n.use(AuthMessages)
    }

    async register(data: Types.RegisterData): Promise<Types.User> {
        this.log.trace('Creating new user: ' + data.email)

        const exists = await this.repo.getUserBaseByEmail(data.email)
        if (exists) {
            throw new Errors.AuthEmailExistsError(this.messages.emailAlreadyExists, data.email)
        }

        const hash = await bcrypt.hash(data.password, 10)

        const user = await this.repo.insertUser({
            username: data.name ?? null,
            user_email: data.email,
            user_password: hash,
        })

        const sessionProfileId = Number(this.config.auth.sessionProfileId ?? 1)
        await this.repo.upsertUserProfile({
            userId: user.user_id,
            profileId: sessionProfileId,
        })

        if (this.config.auth.requireEmailVerification) {
            await this.sendVerificationEmail(user.user_id, data.email)
        }

        return this.mapUser({
            ...user,
            user_email: data.email,
            username: data.name ?? '',
            user_password: hash,
            user_email_verified_at: null,
            user_is_active: true,
            profile_id: sessionProfileId,
            user_created_at: new Date(),
            user_updated_at: new Date(),
        })
    }

    async requestEmailVerification(identifier: string): Promise<void> {
        let user: Types.UserRow | null = null
        if (identifier.includes('@')) {
            user = await this.repo.getUserByEmail(identifier)
        } else {
            user = await this.repo.getUserByUsername(identifier)
        }

        if (user && user.user_email) {
            await this.sendVerificationEmail(user.user_id, user.user_email)
        }
    }

    async verifyEmail(token: string): Promise<void> {
        const purpose = String(this.config.auth.emailVerificationPurpose ?? 'email_verification')
        const tokenHash = sha256Hex(token)

        const otp = await this.repo.getActiveOneTimeCodeForPurposeAndTokenHash({
            purpose,
            tokenHash,
        })

        if (!otp) throw new Errors.AuthTokenInvalidError(this.messages.tokenInvalid)

        await this.repo.setUserEmailVerified(otp.user_id)
        await this.repo.consumeOneTimeCode(otp.id)
    }

    async requestPasswordReset(email: string): Promise<void> {
        const user = await this.repo.getUserByEmail(email)
        if (!user || !user.user_email) return

        const expiresSeconds = 900

        await this.repo.invalidateActivePasswordResetsForUser(user.user_id)

        const token = randomBytes(32).toString('hex')
        const tokenHash = sha256Hex(token)

        await this.repo.insertPasswordReset({
            userId: user.user_id,
            tokenHash,
            sentTo: user.user_email,
            expiresSeconds,
        })

        await this.email.sendTemplate({
            to: user.user_email,
            subject: \`\${this.config.app.name}: Password Reset\`,
            templatePath: 'auth/password-reset.html',
            data: {
                year: new Date().getFullYear(),
                frontendUrl: this.config.app.frontendUrl,
                appName: this.config.app.name,
                token,
            },
        })
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const tokenHash = sha256Hex(token)
        const reset = await this.repo.getPasswordResetByTokenHash(tokenHash)

        if (!reset || reset.used_at)
            throw new Errors.AuthTokenInvalidError(this.messages.tokenInvalid)

        const hash = await bcrypt.hash(newPassword, 10)
        await this.repo.updateUserPassword({ userId: reset.user_id, passwordHash: hash })
        await this.repo.markPasswordResetUsed(reset.id)
    }

    async verifyPasswordResetToken(token: string): Promise<void> {
        const tokenHash = sha256Hex(token)
        const reset = await this.repo.getPasswordResetByTokenHash(tokenHash)
        if (!reset || reset.used_at)
            throw new Errors.AuthTokenInvalidError(this.messages.tokenInvalid)
    }

    async requestUsername(email: string): Promise<void> {
        const user = await this.repo.getUserBaseByEmail(email)
        if (!user || !user.user_email || !user.username) return

        await this.email.sendTemplate({
            to: user.user_email,
            subject: \`\${this.config.app.name}: Username Recovery\`,
            templatePath: 'auth/username-recovery.html',
            data: {
                appName: this.config.app.name,
                username: user.username,
                year: new Date().getFullYear(),
            },
        })
    }

    private async sendVerificationEmail(userId: number, emailAddr: string) {
        const purpose = String(this.config.auth.emailVerificationPurpose ?? 'email_verification')
        const expiresSeconds = 900

        const token = randomBytes(32).toString('hex')
        const tokenHash = sha256Hex(token)

        await this.repo.insertOneTimeCode({
            userId,
            purpose,
            codeHash: tokenHash,
            expiresSeconds,
            meta: { tokenHash },
        })

        await this.email.sendTemplate({
            to: emailAddr,
            subject: \`\${this.config.app.name}: Verify your email\`,
            templatePath: 'auth/email-verification.html',
            data: {
                appName: this.config.app.name,
                code: '000000', // Placeholder
                token,
            },
        })
    }

    private mapUser(row: Types.UserRow): Types.User {
        return {
            user_id: row.user_id,
            user_email: row.user_email,
            username: row.username ?? undefined,
            user_password: row.user_password,
            user_email_verified_at: row.user_email_verified_at
                ? new Date(row.user_email_verified_at)
                : null,
            user_is_active: !!row.user_is_active,
            user_created_at: row.user_created_at ? new Date(row.user_created_at) : new Date(),
            user_updated_at: row.user_updated_at ? new Date(row.user_updated_at) : undefined,
            user_last_login_at: row.user_last_login_at ? new Date(row.user_last_login_at) : null,
            user_solvent: row.user_solvent,
            person_id: row.person_id,
        }
    }
}
`,

    queries: () => `export const AuthQueries = {
    // --- Users
    getUserByEmail: \`
        SELECT u.user_id as id, u.username, u.user_email as email, u.user_email_verified_at as email_verified_at, u.user_password as password_hash, p.profile_id
        FROM security.users u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE u.user_email = $1
    \`,
    // NOTE: Aliasing above to maintain temporary compatibility or should I return raw new names?
    // AuthRepository.ts will be refactored to read new names.
    // AuthTypes.ts UserRow uses new names.
    // So I should NOT use aliases like 'as id'. I should return 'user_id'.

    getUserByEmailRaw: \`
        SELECT u.user_id, u.username, u.user_email, u.user_email_verified_at, u.user_password, p.profile_id, u.user_is_active, u.user_created_at, u.user_last_login_at, u.user_solvent, u.person_id
        FROM security.users u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE u.user_email = $1
    \`,

    getUserByUsername: \`
        SELECT user_id, username, user_email, user_password, user_email_verified_at 
        FROM security.users 
        WHERE username = $1
    \`,

    getUserBaseByEmail: \`
        SELECT user_id, username, user_email, user_password, user_email_verified_at 
        FROM security.users 
        WHERE user_email = $1
    \`,

    insertUser: \`
        INSERT INTO security.users (username, user_email, user_password)
        VALUES ($1, $2, $3)
        RETURNING user_id
    \`,

    upsertUserProfile: \`
        INSERT INTO security.user_profile (user_id, profile_id, assigned_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, profile_id) DO UPDATE SET assigned_at = NOW()
    \`,

    setUserEmailVerified: \`
        UPDATE security.users
        SET user_email_verified_at = NOW()
        WHERE user_id = $1
    \`,

    updateUserPassword: \`
        UPDATE security.users
        SET user_password = $2
        WHERE user_id = $1
    \`,

    // --- Password reset
    insertPasswordReset: \`
        INSERT INTO security.password_resets
        (user_id, token_hash, expires_at, created_at, used_at, attempt_count, token_sent_to, request_ip, user_agent)
        VALUES ($1, $2, NOW() + ($3 || ' seconds')::INTERVAL, NOW(), NULL, 0, $4, $5, $6)
        RETURNING id
    \`,

    invalidateActivePasswordResetsForUser: \`
        UPDATE security.password_resets
        SET used_at = NOW()
        WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
    \`,

    getPasswordResetByTokenHash: \`
        SELECT * FROM security.password_resets
        WHERE token_hash = $1
    \`,

    markPasswordResetUsed: \`
        UPDATE security.password_resets
        SET used_at = NOW()
        WHERE id = $1
    \`,

    // --- One-time codes
    insertOneTimeCode: \`
        INSERT INTO security.one_time_codes
        (user_id, purpose, code_hash, expires_at, created_at, meta)
        VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::INTERVAL, NOW(), $5)
        RETURNING id
    \`,

    consumeOneTimeCode: \`
        UPDATE security.one_time_codes
        SET consumed_at = NOW()
        WHERE id = $1
    \`,

    // Fix query usage of jsonb operator
    getActiveOneTimeCodeForPurposeAndTokenHash: \`
        SELECT * FROM security.one_time_codes
        WHERE purpose = $1 
        AND (meta->>'tokenHash') = $2
        AND consumed_at IS NULL 
        AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
    \`,
} as const

export type AuthQueryKey = keyof typeof AuthQueries
`,

    repository: () => `import { IDatabase } from '../../src/core/business-objects/index.js'
import { AuthQueries, Types } from './AuthModule.js'

/*
Auth Repository

- DB access helpers used by AuthBO.
- Uses AuthQueries from ./AuthQueries.ts
*/
export class AuthRepository implements Types.IAuthRepository {
    constructor(private db: IDatabase) {}

    // --- Users
    async getUserByEmail(email: string): Promise<Types.UserRow | null> {
        const r = await this.db.query<Types.UserRow>(AuthQueries.getUserByEmailRaw, [email])
        return r.rows[0]
    }

    async getUserByUsername(username: string): Promise<Types.UserRow | null> {
        const r = await this.db.query<Types.UserRow>(AuthQueries.getUserByUsername, [username])
        return r.rows[0]
    }

    async getUserBaseByEmail(email: string): Promise<Types.UserRow | null> {
        const r = await this.db.query<Types.UserRow>(AuthQueries.getUserBaseByEmail, [email])
        return r.rows[0]
    }

    async insertUser(params: Types.InsertUserParams): Promise<Types.UserId> {
        const r = await this.db.query<Types.UserId>(AuthQueries.insertUser, [
            params.username,
            params.user_email,
            params.user_password,
        ])
        const row = r.rows[0]
        if (!row.user_id) throw new Error('insertUser did not return user_id')
        return row
    }

    async upsertUserProfile(params: Types.UserWithProfileId): Promise<boolean> {
        await this.db.query(AuthQueries.upsertUserProfile, [params.userId, params.profileId])
        return true
    }

    async setUserEmailVerified(userId: number): Promise<boolean> {
        await this.db.query(AuthQueries.setUserEmailVerified, [userId])
        return true
    }

    // --- Password reset
    async insertPasswordReset(params: Types.PasswordReset): Promise<void> {
        await this.db.query(AuthQueries.insertPasswordReset, [
            params.userId,
            params.tokenHash,
            String(params.expiresSeconds),
            params.sentTo,
            null, // ip
            null, // userAgent
        ])
    }

    async invalidateActivePasswordResetsForUser(userId: number): Promise<boolean> {
        await this.db.query(AuthQueries.invalidateActivePasswordResetsForUser, [userId])
        return true
    }

    async getPasswordResetByTokenHash(tokenHash: string): Promise<Types.PasswordResetRow | null> {
        const r = await this.db.query<Types.PasswordResetRow>(
            AuthQueries.getPasswordResetByTokenHash,
            [tokenHash]
        )
        return r.rows[0]
    }

    async markPasswordResetUsed(resetId: number): Promise<boolean> {
        await this.db.query(AuthQueries.markPasswordResetUsed, [resetId])
        return true
    }

    // --- One-time codes
    async insertOneTimeCode(params: Types.OneTimeCode): Promise<boolean> {
        await this.db.query(AuthQueries.insertOneTimeCode, [
            params.userId,
            params.purpose,
            params.codeHash,
            String(params.expiresSeconds),
            JSON.stringify(params.meta ?? {}),
        ])
        return true
    }

    async consumeOneTimeCode(codeId: number): Promise<boolean> {
        await this.db.query(AuthQueries.consumeOneTimeCode, [codeId])
        return true
    }

    async getActiveOneTimeCodeForPurposeAndTokenHash(
        params: Types.GetActiveOneTimeCodeParams
    ): Promise<Types.OneTimeCodeRow | null> {
        const r = await this.db.query<Types.OneTimeCodeRow>(
            AuthQueries.getActiveOneTimeCodeForPurposeAndTokenHash,
            [params.purpose, params.tokenHash]
        )
        return r.rows[0]
    }

    async updateUserPassword(params: Types.UserPasswordResetParams): Promise<boolean> {
        await this.db.query(AuthQueries.updateUserPassword, [params.userId, params.passwordHash])
        return true
    }
}
`,

    schemas: () => `import { z } from 'zod'
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
            name: z.string().optional(),
        }),

        logout: z.object({
            sessionId: z.string().optional(),
        }),

        verifyEmail: z.object({
            token: z.string().min(1, validation.tokenRequired),
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
`,

    types: () => `export namespace Auth {
    export type UserRow = {
        user_id: number
        username: string
        user_email: string
        user_password: string
        user_email_verified_at?: string | Date | null
        user_is_active?: boolean
        profile_id: number // FK remains profile_id
        user_created_at?: string | Date
        user_updated_at?: string | Date
        user_last_login_at?: string | Date | null
        user_solvent?: boolean
        person_id?: number | null
    }

    export type OneTimeCodeRow = {
        id: number
        user_id: number
        purpose?: string | null
        expires_at?: string | Date | null
        consumed_at?: string | Date | null
        attempt_count?: number | null
        meta?: any
    }

    export type UserId = {
        user_id: number // Renamed from id
    }

    export type UserWithProfileId = {
        userId: number
        profileId: number
    }

    export type InsertUserParams = {
        username: string | null
        user_email: string | null
        user_password: string
    }

    export type PasswordResetRow = {
        id: number
        user_id: number
        expires_at?: string | Date | null
        used_at?: string | Date | null
        attempt_count?: number | null
    }

    export type UserPasswordResetParams = {
        userId: number
        passwordHash: string
    }

    export type PasswordReset = {
        userId: number
        tokenHash: string
        sentTo: string
        expiresSeconds: number
    }

    export type OneTimeCode = {
        userId: number
        purpose: string
        codeHash: string
        expiresSeconds: number
        meta?: any
    }

    export type GetActiveOneTimeCodeParams = {
        purpose: string
        tokenHash: string
    }

    // User Interface matching DB schema as requested
    export interface User {
        user_id: number
        user_email: string
        username?: string
        user_password?: string
        user_is_active: boolean
        user_created_at: Date
        user_updated_at?: Date
        user_last_login_at?: Date | null
        user_email_verified_at?: Date | null

        // Additional business fields
        user_solvent?: boolean
        person_id?: number | null
    }

    export interface UserSummary {
        user_id: number
        user_email: string
        name?: string // username
        user_is_active: boolean
    }

    export interface Session {
        sessionId: string
        userId: number
        token: string
        expiresAt: Date
        createdAt: Date
    }

    export interface AuthToken {
        token: string
        type: 'session' | 'email-verification' | 'password-reset'
        expiresAt: Date
    }

    export interface UserCredentials {
        loginId: string
        password: string
    }

    export interface RegisterData {
        email: string
        password: string
        name?: string
    }

    export interface PasswordResetData {
        token: string
        newPassword: string
    }

    export interface LoginResult {
        user: UserSummary
        session: Session
    }

    export interface RegisterResult {
        user: UserSummary
        verificationSent: boolean
    }

    export interface Repository {
        getUserByEmail(email: string): Promise<UserRow | null>
        getUserByUsername(username: string): Promise<UserRow | null>
        getUserBaseByEmail(email: string): Promise<UserRow | null>
        insertUser(params: InsertUserParams): Promise<UserId>
        upsertUserProfile(params: UserWithProfileId): Promise<boolean>
        setUserEmailVerified(userId: number): Promise<boolean>
        insertPasswordReset(params: PasswordReset): Promise<void>
        invalidateActivePasswordResetsForUser(userId: number): Promise<boolean>
        getPasswordResetByTokenHash(tokenHash: string): Promise<PasswordResetRow | null>
        markPasswordResetUsed(resetId: number): Promise<boolean>
        insertOneTimeCode(params: OneTimeCode): Promise<boolean>
        consumeOneTimeCode(codeId: number): Promise<boolean>
        getActiveOneTimeCodeForPurposeAndTokenHash(
            params: GetActiveOneTimeCodeParams
        ): Promise<OneTimeCodeRow | null>
        updateUserPassword(params: UserPasswordResetParams): Promise<boolean>
    }

    export interface Service {
        register(data: RegisterData): Promise<User>
        requestEmailVerification(identifier: string): Promise<void>
        verifyEmail(token: string): Promise<void>
        requestPasswordReset(email: string): Promise<void>
        verifyPasswordResetToken(token: string): Promise<void>
        resetPassword(token: string, newPassword: string): Promise<void>
        requestUsername(email: string): Promise<void>
    }
}

export type UserRow = Auth.UserRow
export type OneTimeCodeRow = Auth.OneTimeCodeRow
export type UserId = Auth.UserId
export type UserWithProfileId = Auth.UserWithProfileId
export type InsertUserParams = Auth.InsertUserParams
export type PasswordResetRow = Auth.PasswordResetRow
export type UserPasswordResetParams = Auth.UserPasswordResetParams
export type PasswordReset = Auth.PasswordReset
export type OneTimeCode = Auth.OneTimeCode
export type GetActiveOneTimeCodeParams = Auth.GetActiveOneTimeCodeParams
export type User = Auth.User
export type UserSummary = Auth.UserSummary
export type Session = Auth.Session
export type AuthToken = Auth.AuthToken
export type UserCredentials = Auth.UserCredentials
export type RegisterData = Auth.RegisterData
export type PasswordResetData = Auth.PasswordResetData
export type LoginResult = Auth.LoginResult
export type RegisterResult = Auth.RegisterResult
export type IAuthRepository = Auth.Repository
export type IAuthService = Auth.Service
`,

    messages: () => `export const AuthMessages = {
    es: {
        loginSuccess: 'Inicio de sesión exitoso',
        logoutSuccess: 'Cierre de sesión exitoso',
        registerSuccess: 'Registro exitoso',
        emailVerified: 'Email verificado exitosamente',
        passwordResetSent: 'Enlace de recuperación enviado',
        passwordChanged: 'Contraseña actualizada exitosamente',
        verificationSent: 'Enlace de verificación enviado',
        tokenValid: 'Token válido',
        userNotFound: 'Usuario no encontrado',
        invalidCredentials: 'Credenciales inválidas',
        emailNotVerified: 'Email no verificado',
        sessionExpired: 'Sesión expirada',
        tokenInvalid: 'Token inválido o expirado',
        emailAlreadyExists: 'Ya existe un usuario con este email',
        accountDisabled: 'Cuenta deshabilitada',
        validation: {
            loginIdRequired: 'El email o usuario es requerido',
            passwordRequired: 'La contraseña es requerida',
            passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
            emailRequired: 'El email es requerido',
            emailInvalid: 'El email no es válido',
            tokenRequired: 'El token es requerido',
        },
        welcomeBack: 'Bienvenido de nuevo, {name}',
        verificationSentTo: 'Se envió verificación a {email}',
        usernameSent: 'Se envió el usuario a {email}',
    },
    en: {
        loginSuccess: 'Login successful',
        logoutSuccess: 'Logout successful',
        registerSuccess: 'Registered successfully',
        emailVerified: 'Email verified successfully',
        passwordResetSent: 'Recovery link sent',
        passwordChanged: 'Password updated successfully',
        verificationSent: 'Verification link sent',
        tokenValid: 'Valid token',
        userNotFound: 'User not found',
        invalidCredentials: 'Invalid credentials',
        emailNotVerified: 'Email not verified',
        sessionExpired: 'Session expired',
        tokenInvalid: 'Invalid or expired token',
        emailAlreadyExists: 'A user with this email already exists',
        accountDisabled: 'Account disabled',
        validation: {
            loginIdRequired: 'Email or username is required',
            passwordRequired: 'Password is required',
            passwordTooShort: 'Password must be at least 8 characters',
            emailRequired: 'Email is required',
            emailInvalid: 'Email is invalid',
            tokenRequired: 'Token is required',
        },
        welcomeBack: 'Welcome back, {name}',
        verificationSentTo: 'Verification sent to {email}',
        usernameSent: 'Username sent to {email}',
    },
}
`,

    errors: () => `import { BOError, TxKey } from '../../src/core/business-objects/index.js'
import { AuthMessages } from './AuthModule.js'

const defaultMessages = AuthMessages.es

export class AuthError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'AuthError'
    }
}

export class AuthNotFoundError extends AuthError {
    constructor(message?: string) {
        super(message ?? defaultMessages.userNotFound, 'AUTH_USER_NOT_FOUND', 404)
        this.name = 'AuthNotFoundError'
    }
}

export class AuthInvalidCredentialsError extends AuthError {
    constructor(message?: string) {
        super(message ?? defaultMessages.invalidCredentials, 'AUTH_INVALID_CREDENTIALS', 401)
        this.name = 'AuthInvalidCredentialsError'
    }
}

export class AuthEmailNotVerifiedError extends AuthError {
    constructor(message?: string) {
        super(message ?? defaultMessages.emailNotVerified, 'AUTH_EMAIL_NOT_VERIFIED', 403)
        this.name = 'AuthEmailNotVerifiedError'
    }
}

export class AuthSessionExpiredError extends AuthError {
    constructor(message?: string) {
        super(message ?? defaultMessages.sessionExpired, 'AUTH_SESSION_EXPIRED', 401)
        this.name = 'AuthSessionExpiredError'
    }
}

export class AuthTokenInvalidError extends AuthError {
    constructor(message?: string) {
        super(message ?? defaultMessages.tokenInvalid, 'AUTH_TOKEN_INVALID', 400)
        this.name = 'AuthTokenInvalidError'
    }
}

export class AuthEmailExistsError extends AuthError {
    constructor(message?: string, email?: string) {
        super(message ?? defaultMessages.emailAlreadyExists, 'AUTH_EMAIL_EXISTS', 409, { email })
        this.name = 'AuthEmailExistsError'
    }
}

export class AuthAccountDisabledError extends AuthError {
    constructor(message?: string) {
        super(message ?? defaultMessages.accountDisabled, 'AUTH_ACCOUNT_DISABLED', 403)
        this.name = 'AuthAccountDisabledError'
    }
}

export function handleAuthError(error: unknown): AuthError {
    if (error instanceof AuthError) {
        return error
    }
    if (error instanceof Error) {
        return new AuthError('errors.server.serverError', 'AUTH_UNKNOWN_ERROR', 500, {
            message: error.message,
        })
    }
    return new AuthError('errors.server.serverError', 'AUTH_UNKNOWN_ERROR', 500)
}

export function isAuthError(error: unknown): error is AuthError {
    return error instanceof AuthError
}
`,

    module: () => `export { AuthService } from './AuthService.js'
export { AuthRepository } from './AuthRepository.js'
export { AuthMessages } from './AuthMessages.js'
export { AuthSchemas } from './AuthSchemas.js'
export { AuthQueries } from './AuthQueries.js'
export type * as Inputs from './AuthSchemas.js'
export type * as Types from './AuthTypes.js'
export * as Errors from './AuthErrors.js'
export * as Queries from './AuthQueries.js'

import { IContainer } from '../../src/types/core.js'
import { AuthService } from './AuthService.js'
import { AuthRepository } from './AuthRepository.js'

export function registerAuth(container: IContainer) {
    if (!container.has('AuthRepository')) {
        container.registerFactory('AuthRepository', (c) => new AuthRepository(c.resolve('db')))
    }
    if (!container.has('AuthService')) {
        container.registerFactory('AuthService', (c) => new AuthService(c))
    }
}
`,
}
