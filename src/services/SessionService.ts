import bcrypt from 'bcryptjs'
import type * as types from '@toproc/types'
import { LoginSchema, LoginInput, SessionUserRow } from './schemas/session.js'
import { ValidatorService } from './ValidatorService.js'
import { SessionQueries } from './queries/session.js'

type ValidationResponse =
    | { success: true; data: LoginInput }
    | { success: false; errors: types.ValidationError[] }

/**
 * Gestor de sesiones de usuario.
 * Maneja la autenticación segura de usuarios y la gestión de sesiones.
 */
export class SessionManager implements types.ISessionService {
    private db: types.IDatabase
    private log: types.ILogger
    private config: types.IConfig
    private i18n: types.II18nService
    private audit: types.IAuditService
    private requestContext: types.IRequestContextService
    private validator: ValidatorService

    private authCfg: Record<string, unknown>
    private requireEmailVerification: boolean

    constructor(container: types.IContainer) {
        this.db = container.resolve<types.IDatabase>('db')
        this.log = container.resolve<types.ILogger>('log').child({ category: 'Session' })
        this.config = container.resolve<types.IConfig>('config')
        this.i18n = container.resolve<types.II18nService>('i18n')
        this.audit = container.resolve<types.IAuditService>('audit')
        this.requestContext = container.resolve<types.IRequestContextService>('requestContext')
        this.validator = container.resolve<ValidatorService>('validator')

        this.authCfg = (this.config.auth ?? {}) as Record<string, unknown>
        this.requireEmailVerification = Boolean(this.authCfg.requireEmailVerification)
    }

    /**
     * Verifica si una sesión de usuario está actualmente activa.
     *
     * @param req - Objeto Request de Express con la sesión
     * @returns `true` si existe userId en la sesión
     */
    sessionExists(req: types.AppRequest): boolean {
        return !!(req.session && req.session.userId)
    }

    /**
     * Autentica a un usuario y establece una nueva sesión.
     *
     * @param req - Objeto Request que contiene las credenciales (body) y la sesión
     * @returns Promesa con el resultado de la operación (éxito, error o fallo de validación)
     */
    async createSession(req: types.AppRequest, user: SessionUserRow): Promise<types.SessionResult> {
        try {
            this.initializeUserSession(req, user)

            // Updated to use user_id
            await this.updateUserStats(user.user_id)
            await this.auditLoginSuccess(req, user)

            return { status: 'success', user, msg: this.i18n.messages.success.login }
        } catch (error) {
            this.logSystemError(req, error)
            return {
                status: 'error',
                error: this.i18n.messages.errors.client.unknown || {
                    code: 500,
                    msg: 'Unknown Error',
                },
            }
        }
    }

    /**
     * Destruye la sesión actual del usuario (Logout).
     *
     * @param req - Objeto Request con la sesión a destruir
     */
    destroySession(req: types.AppRequest): void {
        try {
            req.session?.destroy?.(() => {})
        } catch {}
    }

    /**
     * Establece o fusiona datos en la sesión actual.
     * @param req - Request con la sesión
     * @param data - Datos a fusionar en la sesión
     */
    setDataSession(req: types.AppRequest, data: any): void {
        if (req.session) {
            // Fusiona las nuevas propiedades sin eliminar las existentes
            Object.assign(req.session, data)
        } else {
            // Si no hay sesión (caso borde), se asigna directamente
            req.session = data
        }
    }

    /**
     * Obtiene una copia de los datos de la sesión actual.
     * @param req - Request con la sesión
     * @returns Copia del objeto de sesión
     */
    getDataSession(req: types.AppRequest): any {
        return req.session ? { ...req.session } : {}
    }

    getCurrentSession<T extends types.AppSessionData = types.AppSessionData>(): T {
        return this.requestContext.getSession<T>()
    }

    setCurrentSession(patch: Partial<types.AppSessionData>): void {
        this.requestContext.setSession(patch)
    }

    hasCurrentSession(): boolean {
        return this.requestContext.hasSession()
    }

    /**
     * Autentica a un usuario.
     * @param req - Request con credenciales en el body
     */
    async authenticate(req: types.AppRequest): Promise<types.SessionResult> {
        try {
            const validation = this.validateLoginRequest(req)
            if (!validation.success) {
                return {
                    status: 'validation_error',
                    error: this.i18n.messages.errors.client.invalidParameters,
                    errors: validation.errors,
                    alerts: this.validator.getAlerts(validation.errors),
                }
            }

            if (this.sessionExists(req)) {
                return { status: 'error', error: this.i18n.messages.errors.client.sessionExists }
            }

            const { identifier, password } = validation.data
            const user = await this.findUserByIdentifier(identifier)

            // Updated to check user_password instead of password_hash
            // TODO(REVERT_NAMING): Revert user_pw to user_password
            if (!user || !(await this.passwordsMatch(password, user.user_pw))) {
                return {
                    status: 'error',
                    error: this.i18n.messages.errors.client.usernameOrPasswordIncorrect,
                }
            }

            if (this.isEmailVerificationPending(user)) {
                return { status: 'error', error: this.i18n.messages.errors.client.emailNotVerified }
            }
            return this.createSession(req, user)
        } catch (error) {
            this.logSystemError(req, error)
            return {
                status: 'error',
                error: this.i18n.messages.errors.client.unknown || {
                    code: 500,
                    msg: 'Unknown Error',
                },
            }
        }
    }

    // =========================================================================
    // Private Helpers (SRP & Readability)
    // =========================================================================

    private validateLoginRequest(req: types.AppRequest): ValidationResponse {
        const result = this.validator.validate<LoginInput>(req.body, LoginSchema)
        if (!result.valid) {
            return { success: false, errors: result.errors }
        }
        return { success: true, data: result.data }
    }

    private async findUserByIdentifier(identifier: string): Promise<SessionUserRow | null> {
        const isEmail = identifier.includes('@')
        const query = isEmail ? SessionQueries.getUserByEmail : SessionQueries.getUserByUsername

        const result = await this.db.query<SessionUserRow>(query, [identifier])

        if (!result.rows || result.rows.length === 0) {
            return null
        }
        return result.rows[0]
    }

    private async passwordsMatch(provided: string, storedHash: string | null): Promise<boolean> {
        if (!storedHash) return false
        return bcrypt.compare(provided, storedHash)
    }

    // TODO(REVERT_NAMING): Revert user_em_verified_dt to user_email_verified_at
    private isEmailVerificationPending(user: SessionUserRow): boolean {
        return this.requireEmailVerification && !user.user_em_verified_dt
    }

    // TODO(REVERT_NAMING): Revert user_na to username, user_em to user_email
    private initializeUserSession(req: types.AppRequest, user: SessionUserRow): void {
        if (req.session) {
            req.session.userId = user.user_id
            req.session.username = user.user_na
            // TODO(REVERT_NAMING): Singular tables & N:M profiles
            const profileIds = Array.isArray(user.profile_ids) ? user.profile_ids : []
            req.session.profileIds = profileIds
            req.session.activeProfileId = profileIds[0]
            req.session.email = user.user_em
        }
    }

    private async updateUserStats(userId: number): Promise<void> {
        try {
            await this.db.query(SessionQueries.updateUserLastLogin, [userId])
        } catch (err) {
            // Stats update failure should not block login flow
        }
    }

    // TODO(REVERT_NAMING): Revert user_na to username
    private async auditLoginSuccess(req: types.AppRequest, user: SessionUserRow): Promise<void> {
        await this.audit.log(req, {
            action: 'login',
            user_id: user.user_id,
            // TODO(REVERT_NAMING): Singular tables & N:M profiles
            profile_id: Array.isArray(user.profile_ids) ? (user.profile_ids[0] ?? null) : null,
            details: { username: user.user_na },
        })
    }

    // =========================================================================
    // Private Helpers (SRP & Readability)
    // =========================================================================

    private logSystemError(req: types.AppRequest, error: unknown): void {
        const msg = this.i18n.messages.errors.server.serverError.msg || 'Server Error'
        const status = this.i18n.messages.errors.server.serverError.code || 500

        this.log.error(
            `${msg}, SessionManager.createSession: ${error instanceof Error ? error.message : String(error)}`,
            {
                requestId: req.requestId,
                method: req.method,
                path: req.originalUrl,
                status,
                userId: req.session?.userId,
            }
        )
    }
}
