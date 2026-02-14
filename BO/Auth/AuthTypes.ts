export namespace Auth {
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
