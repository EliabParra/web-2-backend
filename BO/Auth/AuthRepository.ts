import { IDatabase } from '../../src/core/business-objects/index.js'
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
