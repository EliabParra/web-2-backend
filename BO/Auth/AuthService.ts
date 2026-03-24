import { BOService } from '@toproc/bo'
import type { IContainer, IEmailService } from '@toproc/types'
import { AuthRepository, AuthMessages, Errors, Types } from './AuthModule.js'
import { createHash, randomBytes, randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'

function sha256Hex(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex')
}

export class AuthService extends BOService implements Types.IAuthService {
    private repo: AuthRepository
    private email: IEmailService

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<AuthRepository>('AuthRepository')
        this.email = container.resolve<IEmailService>('email')
    }

    private get messages() {
        return this.i18n.use(AuthMessages)
    }

    private async resolveSessionProfileId(): Promise<number> {
        const configuredId = Number(this.config.auth.sessionProfileId)
        if (Number.isInteger(configuredId) && configuredId > 0) {
            const existingId = await this.repo.getProfileIdById(configuredId)
            if (existingId) return existingId
            this.log.warn(
                `AUTH sessionProfileId=${configuredId} no existe en security.profile; fallback a profile_na='session'.`
            )
        }

        const sessionProfileId = await this.repo.getProfileIdByName('session')
        if (sessionProfileId) return sessionProfileId

        throw new Error(
            "No se encontró perfil de sesión. Configura AUTH_SESSION_PROFILE_ID válido o crea profile_na='session'."
        )
    }

    async register(data: Types.RegisterData): Promise<Types.User> {
        this.log.trace('Creating new user: ' + data.email)

        const exists = await this.repo.getUserBaseByEmail(data.email)
        if (exists) {
            throw new Errors.AuthEmailExistsError(this.messages.emailAlreadyExists, data.email)
        }

        const derivedUsername =
            data.user_na?.trim() || data.name?.trim() || data.email.split('@')[0]?.trim() || ''
        if (!derivedUsername) {
            throw new Errors.AuthInvalidCredentialsError(this.messages.validation.usernameRequired)
        }

        const existingUsername = await this.repo.getUserByUsername(derivedUsername)
        if (existingUsername) {
            throw new Errors.AuthUsernameExistsError(
                this.messages.usernameAlreadyExists,
                derivedUsername
            )
        }

        const hash = await bcrypt.hash(data.password, 10)

        const personName = data.person_na ?? data.name ?? null

        const user = await this.repo.insertUserWithPerson({
            user_na: derivedUsername,
            user_em: data.email,
            user_pw: hash,
            person_ci: data.person_ci ?? null,
            person_na: personName,
            person_ln: data.person_ln ?? null,
            person_ph: data.person_ph ?? null,
            person_deg: data.person_deg ?? null,
        })

        const sessionProfileId = await this.resolveSessionProfileId()
        await this.repo.upsertUserProfile({
            userId: user.user_id,
            profileId: sessionProfileId,
        })

        if (this.config.auth.requireEmailVerification) {
            await this.sendVerificationEmail(user.user_id, data.email)
        }

        return this.mapUser({
            ...user,
            user_em: data.email,
            user_na: derivedUsername,
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

        const purpose = String(this.config.auth.passwordResetPurpose ?? 'password_reset')
        const expiresSeconds = 900

        await this.repo.invalidateActiveOneTimeCodesForUserAndPurpose(user.user_id, purpose)

        const code = randomInt(100000, 999999).toString()
        const codeHash = sha256Hex(code)

        await this.repo.insertOneTimeCode({
            userId: user.user_id,
            purpose,
            codeHash,
            expiresSeconds,
            meta: { channel: 'email', kind: 'password_reset' },
        })

        await this.email.sendTemplate({
            to: user.user_em,
            subject: `${this.config.app.name}: Password Reset`,
            templatePath: 'auth/password-reset.html',
            data: {
                year: new Date().getFullYear(),
                appName: this.config.app.name,
                code,
            },
        })
    }

    async resetPassword(code: string, newPassword: string): Promise<void> {
        const purpose = String(this.config.auth.passwordResetPurpose ?? 'password_reset')
        const codeHash = sha256Hex(code)
        const otp = await this.repo.getActiveOneTimeCodeForPurposeAndCodeHash({
            purpose,
            codeHash,
        })

        if (!otp)
            throw new Errors.AuthTokenInvalidError(this.messages.tokenInvalid)

        const hash = await bcrypt.hash(newPassword, 10)
        await this.repo.updateUserPassword({ userId: otp.user_id, passwordHash: hash })
        await this.repo.consumeOneTimeCode(otp.one_time_code_id)
    }

    async verifyPasswordResetToken(code: string): Promise<void> {
        const purpose = String(this.config.auth.passwordResetPurpose ?? 'password_reset')
        const codeHash = sha256Hex(code)
        const otp = await this.repo.getActiveOneTimeCodeForPurposeAndCodeHash({
            purpose,
            codeHash,
        })
        if (!otp)
            throw new Errors.AuthTokenInvalidError(this.messages.tokenInvalid)
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

    async switchActiveProfile(data: Types.SwitchActiveProfileData): Promise<void> {
        const hasProfile = await this.repo.hasUserProfile(data.userId, data.profileId)
        if (!hasProfile) {
            throw new Errors.AuthError(
                this.messages.profileNotAssigned,
                'AUTH_PROFILE_NOT_ASSIGNED',
                403,
                {
                    userId: data.userId,
                    profileId: data.profileId,
                }
            )
        }
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
            person_ci: row.person_ci ?? null,
            person_na: row.person_na ?? null,
            person_ln: row.person_ln ?? null,
            person_ph: row.person_ph ?? null,
            person_deg: row.person_deg ?? null,
        }
    }
}
