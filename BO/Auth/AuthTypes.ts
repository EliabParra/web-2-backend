export namespace Auth {
    // TODO(REVERT_NAMING): Revert user_na→username, user_em→user_email, user_pw→user_password, user_act→user_is_active, user_created_dt→user_created_at, user_updated_dt→user_updated_at, user_last_login_dt→user_last_login_at, user_em_verified_dt→user_email_verified_at, user_sol→user_solvent
    export type UserRow = {
        user_id: number
        user_na: string
        user_em: string
        user_pw: string
        user_em_verified_dt?: string | Date | null
        user_act?: boolean
        // TODO(REVERT_NAMING): Singular tables & N:M profiles
        profile_ids?: number[]
        user_created_dt?: string | Date
        user_updated_dt?: string | Date
        user_last_login_dt?: string | Date | null
        user_sol?: boolean
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

    // TODO(REVERT_NAMING): Revert user_na→username, user_em→user_email, user_pw→user_password
    export type InsertUserParams = {
        user_na: string | null
        user_em: string | null
        user_pw: string
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
    // TODO(REVERT_NAMING): Revert user_em→user_email, user_na→username, user_pw→user_password, user_act→user_is_active, user_created_dt→user_created_at, user_updated_dt→user_updated_at, user_last_login_dt→user_last_login_at, user_em_verified_dt→user_email_verified_at, user_sol→user_solvent
    export interface User {
        user_id: number
        user_em: string
        user_na?: string
        user_pw?: string
        user_act: boolean
        user_created_dt: Date
        user_updated_dt?: Date
        user_last_login_dt?: Date | null
        user_em_verified_dt?: Date | null

        // Additional business fields
        user_sol?: boolean
        person_id?: number | null
    }

    // TODO(REVERT_NAMING): Revert user_em→user_email, user_act→user_is_active
    export interface UserSummary {
        user_id: number
        user_em: string
        name?: string // user_na
        user_act: boolean
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
