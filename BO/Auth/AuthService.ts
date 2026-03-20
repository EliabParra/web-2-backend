import { BOService } from '@toproc/bo'
import type { IContainer, II18nService, IEmailService } from '@toproc/types'
import { AuthRepository, AuthMessages, Errors, Types } from './AuthModule.js'
import { createHash, randomBytes, randomInt } from 'node:crypto'
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

        // TODO(REVERT_NAMING): Revert user_na to data.name, user_em to data.email, user_pw to hash
        const user = await this.repo.insertUser({
            user_na: data.name ?? null,
            user_em: data.email,
            user_pw: hash,
        })

        const sessionProfileId = Number(this.config.auth.sessionProfileId ?? 1)
        await this.repo.upsertUserProfile({
            userId: user.user_id,
            profileId: sessionProfileId,
        })

        if (this.config.auth.requireEmailVerification) {
            await this.sendVerificationEmail(user.user_id, data.email)
        }

        // TODO(REVERT_NAMING): Revert user_em, user_na, user_pw, user_em_verified_dt, user_act, user_created_dt, user_updated_dt
        return this.mapUser({
            ...user,
            user_em: data.email,
            user_na: data.name ?? '',
            user_pw: hash,
            user_em_verified_dt: null,
            user_act: true,
            // TODO(REVERT_NAMING): Singular tables & N:M profiles
            profile_ids: [sessionProfileId],
            user_created_dt: new Date(),
            user_updated_dt: new Date(),
        })
    }

    async requestEmailVerification(identifier: string): Promise<void> {
        let user: Types.UserRow | null = null
        if (identifier.includes('@')) {
            user = await this.repo.getUserByEmail(identifier)
        } else {
            user = await this.repo.getUserByUsername(identifier)
        }

        if (user?.user_em_verified_dt) throw new Errors.AuthEmailVerifiedError(this.messages.emailAlreadyVerified)

        // TODO(REVERT_NAMING): Revert user_em to user_email
        if (user && user.user_em) {
            await this.sendVerificationEmail(user.user_id, user.user_em)
        }
    }

    async verifyEmail(code: string): Promise<void> {
        const purpose = String(this.config.auth.emailVerificationPurpose ?? 'email_verification')
        const codeHash = sha256Hex(code)

        const otp = await this.repo.getActiveOneTimeCodeForPurposeAndCodeHash({
            purpose,
            codeHash,
        })

        if (!otp) throw new Errors.AuthTokenInvalidError(this.messages.tokenInvalid)

        await this.repo.setUserEmailVerified(otp.user_id)
        // TODO(REVERT_NAMING): Revert one_time_code_id→id
        await this.repo.consumeOneTimeCode(otp.one_time_code_id)
    }

    async requestPasswordReset(email: string): Promise<void> {
        const user = await this.repo.getUserByEmail(email)
        // TODO(REVERT_NAMING): Revert user_em to user_email
        if (!user || !user.user_em) return

        const expiresSeconds = 900

        await this.repo.invalidateActivePasswordResetsForUser(user.user_id)

        const token = randomBytes(32).toString('hex')
        const tokenHash = sha256Hex(token)

        await this.repo.insertPasswordReset({
            userId: user.user_id,
            tokenHash,
            sentTo: user.user_em,
            expiresSeconds,
        })

        await this.email.sendTemplate({
            to: user.user_em,
            subject: `${this.config.app.name}: Password Reset`,
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

        if (!this.isValidPasswordReset(reset))
            throw new Errors.AuthTokenInvalidError(this.messages.tokenInvalid)

        const hash = await bcrypt.hash(newPassword, 10)
        const validReset = reset
        await this.repo.updateUserPassword({ userId: validReset.user_id, passwordHash: hash })
        // TODO(REVERT_NAMING): Revert password_reset_id→id
        await this.repo.markPasswordResetUsed(validReset.password_reset_id)
    }

    async verifyPasswordResetToken(token: string): Promise<void> {
        const tokenHash = sha256Hex(token)
        const reset = await this.repo.getPasswordResetByTokenHash(tokenHash)
        if (!this.isValidPasswordReset(reset))
            throw new Errors.AuthTokenInvalidError(this.messages.tokenInvalid)
    }

    // TODO(REVERT_NAMING): Revert password_reset_used_dt→used_at, password_reset_expires_dt→expires_at
    private isValidPasswordReset(reset: Types.PasswordResetRow | null): reset is Types.PasswordResetRow {
        if (!reset || reset.password_reset_used_dt) return false
        if (!reset.password_reset_expires_dt) return false

        const expiresAt = new Date(reset.password_reset_expires_dt)
        if (Number.isNaN(expiresAt.getTime())) return false

        return expiresAt.getTime() > Date.now()
    }

    async requestUsername(email: string): Promise<void> {
        const user = await this.repo.getUserBaseByEmail(email)
        // TODO(REVERT_NAMING): Revert user_em to user_email, user_na to username
        if (!user || !user.user_em || !user.user_na) return

        await this.email.sendTemplate({
            to: user.user_em,
            subject: `${this.config.app.name}: Username Recovery`,
            templatePath: 'auth/username-recovery.html',
            data: {
                appName: this.config.app.name,
                username: user.user_na,
                year: new Date().getFullYear(),
            },
        })
    }

    private async sendVerificationEmail(userId: number, emailAddr: string) {
        const purpose = String(this.config.auth.emailVerificationPurpose ?? 'email_verification')
        const expiresSeconds = 900

        const token = randomBytes(32).toString('hex')
        const tokenHash = sha256Hex(token)

        const code = randomInt(100000, 999999).toString()
        const codeHash = sha256Hex(code)

        await this.repo.insertOneTimeCode({
            userId,
            purpose,
            codeHash,
            expiresSeconds,
            meta: { tokenHash },
        })

        await this.email.sendTemplate({
            to: emailAddr,
            subject: `${this.config.app.name}: Verify your email`,
            templatePath: 'auth/email-verification.html',
            data: {
                appName: this.config.app.name,
                code,
                token,
            },
        })
    }

    // TODO(REVERT_NAMING): Revert user_em, user_na, user_pw, user_em_verified_dt, user_act, user_created_dt, user_updated_dt, user_last_login_dt, user_sol
    private mapUser(row: Types.UserRow): Types.User {
        return {
            user_id: row.user_id,
            user_em: row.user_em,
            user_na: row.user_na ?? undefined,
            user_pw: row.user_pw,
            user_em_verified_dt: row.user_em_verified_dt
                ? new Date(row.user_em_verified_dt)
                : null,
            user_act: !!row.user_act,
            user_created_dt: row.user_created_dt ? new Date(row.user_created_dt) : new Date(),
            user_updated_dt: row.user_updated_dt ? new Date(row.user_updated_dt) : undefined,
            user_last_login_dt: row.user_last_login_dt ? new Date(row.user_last_login_dt) : null,
            user_sol: row.user_sol,
            person_id: row.person_id,
        }
    }
}
