import { BaseBO } from '@toproc/bo'
import { IContainer, ApiResponse } from '@toproc/types'
import { AuthService, AuthMessages, AuthSchemas, Inputs, Types, registerAuth } from './AuthModule.js'

/**
 * Business Object para autenticación.
 */
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
        return this.exec<Inputs.VerifyEmailInput, void>(
            params,
            AuthSchemas.verifyEmail,
            async (data) => {
                await this.service.verifyEmail(data.code)
                return this.success(null, this.authMessages.emailVerified)
            }
        )
    }

    async requestEmailVerification(
        params: Inputs.RequestEmailVerificationInput
    ): Promise<ApiResponse> {
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
                await this.service.verifyPasswordResetToken(data.code)
                return this.success(null, this.authMessages.tokenValid)
            }
        )
    }

    async resetPassword(params: Inputs.ResetPasswordConfirmInput): Promise<ApiResponse> {
        return this.exec<Inputs.ResetPasswordConfirmInput, void>(
            params,
            AuthSchemas.resetPasswordConfirm,
            async (data) => {
                await this.service.resetPassword(data.code, data.newPassword)
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
                return this.success(
                    null,
                    this.i18n.format(this.authMessages.usernameSent, {
                        email: data.email,
                    })
                )
            }
        )
    }

    async getNavigation(params: Inputs.GetNavigationInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetNavigationInput, unknown>(
            params,
            AuthSchemas.getNavigation,
            async () => {
                const session = this.getSessionData<Types.SessionContextData>()
                const userId = Number(session.userId)

                if (!Number.isInteger(userId) || userId <= 0) {
                    return this.unauthorized()
                }

                const profileIds = Array.isArray(session.profileIds)
                    ? session.profileIds.filter((id) => Number.isInteger(id))
                    : []

                const activeProfileId =
                    Number.isInteger(session.activeProfileId) &&
                    profileIds.includes(Number(session.activeProfileId))
                        ? Number(session.activeProfileId)
                        : null

                const mode = this.config.auth?.profileResolutionMode === 'union' ? 'union' : 'active'
                const effectiveProfileIds =
                    mode === 'active'
                        ? activeProfileId != null
                            ? [activeProfileId]
                            : []
                        : profileIds

                if (effectiveProfileIds.length === 0) {
                    return this.forbidden(this.authMessages.profileNotAssigned)
                }

                const navigation = await this.security.getMenuStructure(effectiveProfileIds)

                const response: Types.NavigationResponse = {
                    session: {
                        userId,
                        username: session.username ? String(session.username) : null,
                        email: session.email ? String(session.email) : null,
                        profileIds,
                        activeProfileId,
                        mode,
                        effectiveProfileIds,
                    },
                    navigation,
                }

                return this.success(response, this.authMessages.navigationLoaded)
            }
        )
    }

    async switchActiveProfile(params: Inputs.SwitchActiveProfileInput): Promise<ApiResponse> {
        return this.exec<Inputs.SwitchActiveProfileInput, unknown>(
            params,
            AuthSchemas.switchActiveProfile,
            async (data) => {
                const session = this.getSessionData<Types.SwitchActiveProfileData>()
                const userId = Number(session.userId)

                if (!Number.isInteger(userId) || userId <= 0) {
                    return this.unauthorized()
                }

                await this.service.switchActiveProfile({ userId, profileId: data.profileId })
                this.setSessionData({ activeProfileId: data.profileId })

                return this.success(
                    { activeProfileId: data.profileId },
                    this.authMessages.activeProfileChanged
                )
            }
        )
    }
}
