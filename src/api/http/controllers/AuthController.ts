import {
    IContainer,
    ISessionService,
    IAuditService,
    II18nService,
    AppRequest,
    AppResponse,
    ILogger,
} from '../../../types/index.js'
import { sendInvalidParameters } from '../../../utils/http-responses.js'

/**
 * Controlador de Autenticación.
 *
 * Gestiona los endpoints de inicio y cierre de sesión.
 * Delega la lógica de negocio al SessionService y maneja las respuestas HTTP.
 */
export class AuthController {
    private session: ISessionService
    private audit: IAuditService
    private log: ILogger
    private i18n: II18nService

    constructor(container: IContainer) {
        this.session = container.resolve<ISessionService>('session')
        this.audit = container.resolve<IAuditService>('audit')
        this.log = container.resolve<ILogger>('log').child({ category: 'AuthController' })
        this.i18n = container.resolve<II18nService>('i18n')
    }

    /**
     * Procesa la petición de login.
     *
     * @param req - Request de Express
     * @param res - Response de Express
     * @param next - Función next (para errores no manejados)
     */
    async login(req: AppRequest, res: AppResponse, next: Function): Promise<void> {
        try {
            const result = await this.session.createSession(req)

            if (result.status === 'success') {
                res.status(result.msg.code).send(result.msg)
                return
            }

            if (result.status === 'validation_error') {
                res.status(result.error.code).send({
                    msg: result.error.msg,
                    code: result.error.code,
                    alerts: result.alerts,
                    errors: result.errors,
                })
                return
            }

            // Error de negocio o credenciales
            res.status(result.error.code).send(result.error)
        } catch (err) {
            next(err)
        }
    }

    /**
     * Procesa la petición de logout.
     *
     * @param req - Request de Express
     * @param res - Response de Express
     * @param next - Función next (para errores no manejados)
     */
    async logout(req: AppRequest, res: AppResponse, next: Function): Promise<void> {
        try {
            const body = req.body
            // Validación básica de body vacío o objeto
            if (body != null && (typeof body !== 'object' || Array.isArray(body))) {
                sendInvalidParameters(res, this.i18n.messages.errors.client.invalidParameters, [
                    'Invalid body',
                ])
                return
            }

            if (this.session.sessionExists(req)) {
                await this.audit.log(req, { action: 'logout', details: {} })
                this.session.destroySession(req)
                res.status(this.i18n.messages.success.logout.code).send(
                    this.i18n.messages.success.logout
                )
                return
            }

            res.status(this.i18n.messages.errors.client.login.code).send(
                this.i18n.messages.errors.client.login
            )
        } catch (err) {
            next(err)
        }
    }
}
