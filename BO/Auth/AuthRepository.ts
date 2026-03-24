import { IDatabase } from '@toproc/types'
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

    async getProfileIdById(profileId: number): Promise<number | null> {
        const r = await this.db.query<{ profile_id: number }>(AuthQueries.getProfileIdById, [profileId])
        const id = r.rows[0]?.profile_id
        return Number.isInteger(id) ? Number(id) : null
    }

    async getProfileIdByName(profileName: string): Promise<number | null> {
        const r = await this.db.query<{ profile_id: number }>(AuthQueries.getProfileIdByName, [profileName])
        const id = r.rows[0]?.profile_id
        return Number.isInteger(id) ? Number(id) : null
    }

    async hasUserProfile(userId: number, profileId: number): Promise<boolean> {
        const r = await this.db.query(AuthQueries.hasUserProfile, [userId, profileId])
        return (r.rowCount ?? 0) > 0
    }

    // TODO(REVERT_NAMING): Revert user_na to username, user_em to user_email, user_pw to user_password
    async insertUserWithPerson(params: Types.InsertUserWithPersonParams): Promise<Types.UserRow> {
        const r = await this.db.query<Types.UserRow>(AuthQueries.insertUserWithPerson, [
            params.user_na,
            params.user_em,
            params.user_pw,
            params.person_ci ?? null,
            params.person_na ?? null,
            params.person_ln ?? null,
            params.person_ph ?? null,
            params.person_deg ?? null,
        ])
        const row = r.rows[0]
        if (!row.user_id) throw new Error('insertUserWithPerson did not return user_id')
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

    async invalidateActiveOneTimeCodesForUserAndPurpose(
        userId: number,
        purpose: string
    ): Promise<boolean> {
        await this.db.query(AuthQueries.invalidateActiveOneTimeCodesForUserAndPurpose, [
            userId,
            purpose,
        ])
        return true
    }

    async getActiveOneTimeCodeForPurposeAndCodeHash(
        params: Types.GetActiveOneTimeCodeParams
    ): Promise<Types.OneTimeCodeRow | null> {
        const r = await this.db.query<Types.OneTimeCodeRow>(
            AuthQueries.getActiveOneTimeCodeForPurposeAndCodeHash,
            [params.purpose, params.codeHash]
        )
        return r.rows[0]
    }

    async updateUserPassword(params: Types.UserPasswordResetParams): Promise<boolean> {
        await this.db.query(AuthQueries.updateUserPassword, [params.userId, params.passwordHash])
        return true
    }
}
