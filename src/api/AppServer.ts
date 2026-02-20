import express, { Express, RequestHandler } from 'express'
import { Server } from 'http'
import {
    IContainer,
    IConfig,
    ILogger,
    ISessionService,
    IDatabase,
    II18nService,
    AppRequest,
    AppResponse,
} from '../types/index.js'
import { registerFrontendHosting } from '../frontend-adapters/index.js'

// Middlewares consolidados
import {
    applyHelmet,
    applyRequestId,
    applyRequestLogger,
    applyCorsIfEnabled,
    applyBodyParsers,
    applySessionMiddleware,
    createJsonSyntaxErrorHandler,
    createCsrfProtection,
    createCsrfTokenHandler,
    createFinalErrorHandler,
} from './http/middleware/index.js'


import {
    createLoginRateLimiter,
    createToProccessRateLimiter,
    createAuthPasswordResetRateLimiter,
} from './http/rate-limit/index.js'

// Handlers
import { AuthController } from './http/controllers/AuthController.js'
import { TransactionController } from './http/controllers/TransactionController.js'
import { ProbeController } from './http/controllers/ProbeController.js'

/**
 * Servidor de Aplicación (AppServer).
 *
 * Responsable de:
 * - Bootstrapping de Express.
 * - Configuración de Middlewares globales.
 * - Enrutamiento a controladores.
 * - Ciclo de vida del servidor HTTP.
 *
 * Antes conocido como Dispatcher.
 */
export class AppServer {
    /** Instancia de Express */
    public app: Express

    /** Servidor HTTP (null hasta llamar serverOn) */
    public server: Server | null

    /** Indica si init() fue ejecutado */
    public initialized: boolean

    // Contenedor IoC
    private readonly container: IContainer

    // Dependencias inyectadas
    private readonly config: IConfig
    private readonly log: ILogger
    private readonly session: ISessionService
    private readonly i18n: II18nService
    private readonly db: IDatabase

    // Controladores
    private authController: AuthController
    private txController: TransactionController
    private probeController: ProbeController

    // Middlewares guardados
    private loginRateLimiter: RequestHandler
    private authPasswordResetRateLimiter: RequestHandler
    private csrfTokenHandler: RequestHandler
    private csrfProtection: RequestHandler
    private _toProccessRateLimiter: RequestHandler | null = null

    constructor(container: IContainer) {
        this.container = container
        this.config = container.resolve<IConfig>('config')
        this.log = container.resolve<ILogger>('log').child({ category: 'System' })
        this.session = container.resolve<ISessionService>('session')
        this.i18n = container.resolve<II18nService>('i18n')
        this.db = container.resolve<IDatabase>('db')
        
        // Resolve pre-registered controllers from the IoC container
        this.authController = container.resolve<AuthController>('authController')
        this.txController = container.resolve<TransactionController>('txController')
        this.probeController = container.resolve<ProbeController>('probeController')

        this.app = express()

        this.server = null
        this.initialized = false

        // Configurar Express base
        this.setupExpress()
        this.container.register('expressApp', this.app)

        // Inicializar Middlewares de Seguridad (Factories)
        this.csrfTokenHandler = createCsrfTokenHandler(this.i18n)
        this.csrfProtection = createCsrfProtection(this.i18n)

        this.loginRateLimiter = createLoginRateLimiter(this.container)
        this.authPasswordResetRateLimiter = createAuthPasswordResetRateLimiter(this.container)
    }

    /**
     * Rate limiter para /toProccess (lazy initialization).
     */
    public get toProccessRateLimiter(): RequestHandler {
        if (!this._toProccessRateLimiter) {
            this._toProccessRateLimiter = createToProccessRateLimiter(this.container)
        }
        return this._toProccessRateLimiter
    }

    private setupExpress(): void {
        this.app.disable('x-powered-by')
        if (this.config.app.trustProxy != null) {
            this.app.set('trust proxy', this.config.app.trustProxy)
        }
        applyHelmet(this.app)
        applyRequestId(this.app)
        applyRequestLogger(this.app, this.log)
        applyCorsIfEnabled(this.app, this.config)
        applyBodyParsers(this.app, this.config)
        this.app.use(createJsonSyntaxErrorHandler(this.i18n))
    }

    /**
     * Inicializa el servidor, controladores y rutas.
     */
    async init(): Promise<void> {
        // 1. Session Middleware
        applySessionMiddleware(this.app, this.container)

        // 2. Session Adapter
        const sessionAdapter = {
            sessionExists: (req: AppRequest) => this.session.sessionExists(req),
        }

        // 3. Frontend Pre-API (SPA support)
        await registerFrontendHosting(this.app, {
            container: this.container,
            session: sessionAdapter,
            stage: 'preApi',
        })

        // 4. Rutas API
        this.setupRoutes()

        // 5. Frontend Post-API (Fallbacks)
        await registerFrontendHosting(this.app, {
            container: this.container,
            session: sessionAdapter,
            stage: 'postApi',
        })

        // 6. Error Handler Final
        this.app.use(createFinalErrorHandler(this.container))

        this.initialized = true
    }

    private setupRoutes(): void {
        const router = express.Router()

        // Probes
        router.get('/health', (req, res, next) =>
            this.probeController.health(req as AppRequest, res as AppResponse)
        )
        router.get('/ready', (req, res, next) =>
            this.probeController.ready(req as AppRequest, res as AppResponse)
        )

        // Security
        router.get('/csrf', this.csrfTokenHandler)

        // Auth
        router.post('/login', this.loginRateLimiter, this.csrfProtection, (req, res, next) =>
            this.authController.login(req as AppRequest, res as AppResponse, next)
        )
        router.post('/logout', this.csrfProtection, (req, res, next) =>
            this.authController.logout(req as AppRequest, res as AppResponse, next)
        )

        // Transactions
        router.post(
            '/toProccess',
            this.toProccessRateLimiter,
            this.authPasswordResetRateLimiter,
            this.csrfProtection,
            (req, res, next) =>
                this.txController.handle(req as AppRequest, res as AppResponse, next)
        )

        this.app.use(router)
    }

    serverOn(): Server {
        if (!this.initialized) throw new Error('AppServer not initialized')
        this.server = this.app.listen(this.config.app.port, '0.0.0.0', () => {
            this.log.info(
                `Servidor ejecutándose en http://${this.config.app.host}:${this.config.app.port}`
            )
        })
        return this.server
    }

    async shutdown(): Promise<void> {
        return new Promise((resolve, reject) => {
            const closeServer = () => {
                if (!this.server) return Promise.resolve()
                return new Promise<void>((subResolve, subReject) => {
                    this.server?.close((err) => (err ? subReject(err) : subResolve()))
                })
            }

            closeServer()
                .then(async () => {
                    this.log.info('Cerrando conexiones de base de datos...')
                    await this.db.shutdown()
                    resolve()
                })
                .catch(reject)
        })
    }
}
