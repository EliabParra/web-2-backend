import { BOService, II18nService, IEmailService, IContainer } from '../../src/core/business-objects/index.js'
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
            subject: `${this.config.app.name}: Verify your email`,
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
