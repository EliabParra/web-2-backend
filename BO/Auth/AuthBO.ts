import { BaseBO, ApiResponse, IContainer } from '../../src/core/business-objects/index.js'
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
}
