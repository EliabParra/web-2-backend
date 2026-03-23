export namespace Auth {
    // TODO(REVERT_NAMING): Revert user_na→username, user_em→user_email, user_pw→user_password, user_act→user_is_active, user_created_dt→user_created_at, user_updated_dt→user_updated_at, user_last_login_dt→user_last_login_at, user_em_verified_dt→user_email_verified_at, user_sol→user_solvent
    // TODO(REVERT_NAMING): Revert auth columns: password_reset_id→id, password_reset_expires_dt→expires_at, password_reset_used_dt→used_at, password_reset_ac→attempt_count, one_time_code_id→id, one_time_code_pu→purpose, one_time_code_expires_dt→expires_at, one_time_code_consumed_dt→consumed_at, one_time_code_ac→attempt_count, one_time_code_meta→meta
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
        person_ci?: string | null
        person_na?: string | null
        person_ln?: string | null
        person_ph?: string | null
        person_deg?: string | null
    }

    // TODO(REVERT_NAMING): Revert one_time_code_id→id, one_time_code_pu→purpose, one_time_code_expires_dt→expires_at, one_time_code_consumed_dt→consumed_at, one_time_code_ac→attempt_count, one_time_code_meta→meta
    export type OneTimeCodeRow = {
        one_time_code_id: number
        user_id: number
        one_time_code_pu?: string | null
        one_time_code_expires_dt?: string | Date | null
        one_time_code_consumed_dt?: string | Date | null
        one_time_code_ac?: number | null
        one_time_code_meta?: any
    }

    export type UserId = {
        user_id: number // Renamed from id
    }

    export type UserWithProfileId = {
        userId: number
        profileId: number
    }

    // TODO(REVERT_NAMING): Revert user_na→username, user_em→user_email, user_pw→user_password
    export type InsertUserWithPersonParams = {
        user_na: string
        user_em: string | null
        user_pw: string
        person_ci?: string | null
        person_na?: string | null
        person_ln?: string | null
        person_ph?: string | null
        person_deg?: string | null
    }

    // TODO(REVERT_NAMING): Revert password_reset_id→id, password_reset_expires_dt→expires_at, password_reset_used_dt→used_at, password_reset_ac→attempt_count
    export type PasswordResetRow = {
        password_reset_id: number
        user_id: number
        password_reset_expires_dt?: string | Date | null
        password_reset_used_dt?: string | Date | null
        password_reset_ac?: number | null
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
        codeHash: string
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
        person_ci?: string | null
        person_na?: string | null
        person_ln?: string | null
        person_ph?: string | null
        person_deg?: string | null
    }

    // TODO(REVERT_NAMING): Revert user_em→user_email, user_act→user_is_active
    export interface UserSummary {
        user_id: number
        user_em: string
        name?: string // user_na
        user_act: boolean
        person_na?: string | null
        person_ln?: string | null
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
        user_na?: string
        person_ci?: string | null
        person_na?: string | null
        person_ln?: string | null
        person_ph?: string | null
        person_deg?: string | null
        name?: string
    }

    export interface PasswordResetData {
        code: string
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
        insertUserWithPerson(params: InsertUserWithPersonParams): Promise<UserRow>
        upsertUserProfile(params: UserWithProfileId): Promise<boolean>
        setUserEmailVerified(userId: number): Promise<boolean>
        insertPasswordReset(params: PasswordReset): Promise<void>
        invalidateActivePasswordResetsForUser(userId: number): Promise<boolean>
        getPasswordResetByTokenHash(tokenHash: string): Promise<PasswordResetRow | null>
        markPasswordResetUsed(resetId: number): Promise<boolean>
        insertOneTimeCode(params: OneTimeCode): Promise<boolean>
        consumeOneTimeCode(codeId: number): Promise<boolean>
        invalidateActiveOneTimeCodesForUserAndPurpose(
            userId: number,
            purpose: string
        ): Promise<boolean>
        getActiveOneTimeCodeForPurposeAndCodeHash(
            params: GetActiveOneTimeCodeParams
        ): Promise<OneTimeCodeRow | null>
        updateUserPassword(params: UserPasswordResetParams): Promise<boolean>
    }

    export interface Service {
        register(data: RegisterData): Promise<User>
        requestEmailVerification(identifier: string): Promise<void>
        verifyEmail(code: string): Promise<void>
        requestPasswordReset(email: string): Promise<void>
        verifyPasswordResetToken(code: string): Promise<void>
        resetPassword(code: string, newPassword: string): Promise<void>
        requestUsername(email: string): Promise<void>
    }
}

export type UserRow = Auth.UserRow
export type OneTimeCodeRow = Auth.OneTimeCodeRow
export type UserId = Auth.UserId
export type UserWithProfileId = Auth.UserWithProfileId
export type InsertUserWithPersonParams = Auth.InsertUserWithPersonParams
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
