// Express
import express, { Express, RequestHandler } from 'express'
import { Server } from 'http'

// Types
import {
    IContainer,
    IConfig,
    ILogger,
    ISessionService,
    IDatabase,
    II18nService,
    AppRequest,
    AppResponse,
} from '@toproc/types'

// Frontend Adapters
import { registerFrontendHosting } from '@toproc/frontend-adapters/index.js'

// Middlewares
import * as middlewares from '@toproc/middleware'

// Rate Limit
import * as rateLimit from '@toproc/api/http/rate-limit/index.js'

// Controllers
import * as controllers from '@toproc/controllers'

// Toproc Explorer
import { createExplorerRouter } from '@toproc/scripts/explorer/router.js'
import { generateExplorerSpec } from '@toproc/scripts/explorer/generate.js'

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
    private authController: controllers.AuthController
    private txController: controllers.TransactionController
    private probeController: controllers.ProbeController

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
        this.authController = container.resolve<controllers.AuthController>('authController')
        this.txController = container.resolve<controllers.TransactionController>('txController')
        this.probeController = container.resolve<controllers.ProbeController>('probeController')

        this.app = express()

        this.server = null
        this.initialized = false

        // Configurar Express base
        this.setupExpress()
        this.container.register('expressApp', this.app)

        // Inicializar Middlewares de Seguridad (Factories)
        this.csrfTokenHandler = middlewares.createCsrfTokenHandler(this.i18n)
        this.csrfProtection = middlewares.createCsrfProtection(this.i18n, this.config)

        this.loginRateLimiter = rateLimit.createLoginRateLimiter(this.container)
        this.authPasswordResetRateLimiter = rateLimit.createAuthPasswordResetRateLimiter(this.container)
    }

    /**
     * Rate limiter para /toProccess (lazy initialization).
     */
    public get toProccessRateLimiter(): RequestHandler {
        if (!this._toProccessRateLimiter) {
            this._toProccessRateLimiter = rateLimit.createToProccessRateLimiter(this.container)
        }
        return this._toProccessRateLimiter
    }

    private setupExpress(): void {
        this.app.disable('x-powered-by')
        if (this.config.app.trustProxy != null) {
            this.app.set('trust proxy', this.config.app.trustProxy)
        }
        middlewares.applyHelmet(this.app)
        middlewares.applyRequestId(this.app)
        middlewares.applyRequestLogger(this.app, this.log)
        middlewares.applyCorsIfEnabled(this.app, this.config)
        middlewares.applyBodyParsers(this.app, this.config)
        this.app.use(middlewares.createJsonSyntaxErrorHandler(this.i18n))
    }

    /**
     * Inicializa el servidor, controladores y rutas.
     */
    async init(): Promise<void> {
        // 1. Session Middleware
        middlewares.applySessionMiddleware(this.app, this.container)

        // 1.1 Request Context Middleware (ALS)
        middlewares.applyRequestContext(this.app, this.container)

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

        // 3.5. Explorer (Solo en desarrollo)
        if (this.config.app.env !== 'production') {
            try {
                await generateExplorerSpec({ includeDbTxSync: true })
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error)
                this.log.warn(`No se pudo generar Explorer spec al iniciar: ${message}`)
            }
            this.app.use('/explorer', createExplorerRouter(this.container, this.txController))
        }

        // 4. Rutas API
        this.setupRoutes()

        // 5. Frontend Post-API (Fallbacks)
        await registerFrontendHosting(this.app, {
            container: this.container,
            session: sessionAdapter,
            stage: 'postApi',
        })

        // 6. Error Handler Final
        this.app.use(middlewares.createFinalErrorHandler(this.container))

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
