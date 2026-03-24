import {
    IContainer,
    ISessionService,
    IConfig,
    II18nService,
    AppRequest,
    AppResponse,
} from '@toproc/types'
import { sendInvalidParameters } from '@toproc/utils'
import { TransactionOrchestrator } from '@toproc/transaction'

/**
 * Controlador de Transacciones de Negocio.
 *
 * Maneja el endpoint principal `/toProccess` que orquesta la ejecución
 * de métodos de negocio (BOs) basada en códigos de transacción (TX).
 */
export class TransactionController {
    private orchestrator: TransactionOrchestrator
    private session: ISessionService
    private config: IConfig
    private i18n: II18nService

    constructor(container: IContainer) {
        this.orchestrator = container.resolve<TransactionOrchestrator>('orchestrator')
        this.session = container.resolve<ISessionService>('session')
        this.config = container.resolve<IConfig>('config')
        this.i18n = container.resolve<II18nService>('i18n')
    }

    /**
     * Procesa una transacción de negocio.
     *
     * @param req - Request de Express
     * @param res - Response de Express
     * @param next - Función next
     */
    async handle(req: AppRequest, res: AppResponse, next: Function): Promise<void> {
        // TODO(REVERT_NAMING): Singular tables & N:M profiles
        let effectiveProfileIds: number[] = []

        try {
            // 1. Determinar profileIds
            const hasSession = this.session.sessionExists(req)
            const publicProfileId = Number(this.config.auth?.publicProfileId)
            const profileResolutionMode =
                this.config.auth?.profileResolutionMode === 'union' ? 'union' : 'active'

            const rawSessionProfileIds = req.session?.profileIds
            const sessionProfileIds =
                hasSession && Array.isArray(rawSessionProfileIds)
                    ? rawSessionProfileIds.filter((id) => Number.isInteger(id))
                    : []
            const rawActiveProfileId = req.session?.activeProfileId
            const activeProfileId =
                Number.isInteger(rawActiveProfileId) &&
                sessionProfileIds.includes(rawActiveProfileId as number)
                    ? (rawActiveProfileId as number)
                    : null

            effectiveProfileIds =
                hasSession && profileResolutionMode === 'active'
                    ? activeProfileId != null
                        ? [activeProfileId]
                        : []
                    : hasSession
                      ? sessionProfileIds
                    : Number.isInteger(publicProfileId) && publicProfileId > 0
                      ? [publicProfileId]
                      : []

            if (hasSession && effectiveProfileIds.length === 0) {
                res.status(this.i18n.messages.errors.client.permissionDenied.code).send(
                    this.i18n.messages.errors.client.permissionDenied
                )
                return
            }

            if (!hasSession && effectiveProfileIds.length === 0) {
                res.status(this.i18n.messages.errors.client.login.code).send(
                    this.i18n.messages.errors.client.login
                )
                return
            }

            // 2. Validar estructura del body
            const body = req.body
            const alerts: string[] = []

            if (!body || typeof body !== 'object' || Array.isArray(body)) {
                alerts.push(this.i18n.messages.alerts.invalidBody || 'Invalid body')
            }

            const tx = body?.tx
            if (!Number.isInteger(tx) || tx <= 0) {
                alerts.push(this.i18n.messages.alerts.invalidTx || 'Invalid tx')
            }

            const params = body?.params
            if (params !== undefined && params !== null) {
                const isValidParams =
                    typeof params === 'string' ||
                    (typeof params === 'number' && Number.isFinite(params)) ||
                    (typeof params === 'object' && !Array.isArray(params))

                if (!isValidParams) {
                    alerts.push(
                        this.i18n.format(this.i18n.messages.alerts.paramsType, {
                            value: 'params',
                        }) || 'Invalid params'
                    )
                }
            }

            if (alerts.length > 0) {
                sendInvalidParameters(
                    res,
                    this.i18n.messages.errors.client.invalidParameters,
                    alerts
                )
                return
            }

            // 3. Preparar Contexto de Seguridad
            // cast to any for legacy user object access until proper Session type update
            const session = req.session as any
            const rawUserId = session?.userId ?? session?.user_id
            const userId = rawUserId != null ? Number(rawUserId) : null // null = Anon/System
            const username = session?.username ?? session?.user?.username ?? 'anonymous'

            // Inyectar metadatos legacy para Auth
            // (Esto idealmente debería hacerse dentro de AuthBO, pero lo mantenemos por compatibilidad)
            const effectiveParams: Record<string, unknown> =
                params && typeof params === 'object' && !Array.isArray(params)
                    ? { ...params }
                    : { value: params }

            // 4. Ejecutar vía Orchestrator
            // Orchestrator maneja: Resolución, Validación Ruta, Autorización, Ejecución, Auditoría.
            const result = await this.orchestrator.execute(
                tx,
                {
                    userId,
                    profileIds: effectiveProfileIds,
                    username,
                },
                effectiveParams
            )

            // Orchestrator retorna estructura de error estándar si falla.
            // Si es success, retorna lo que el BO retorne.

            // Asumimos que result tiene la forma { code, msg, ... } o data pura
            // BaseBO suele retornar { code, msg, data }
            const anyResult = result as any
            const statusCode =
                anyResult?.code && Number.isInteger(anyResult.code) ? anyResult.code : 200

            res.status(statusCode).send(result)
        } catch (err: unknown) {
            next(err)
        }
    }
}
