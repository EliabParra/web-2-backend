/**
 * Pruebas de integración HTTP para el módulo Auth.
 *
 * Valida el flujo completo: CSRF → Login → Registro vía `/toProccess` → Logout,
 * usando un AppServer real con dependencias mockeadas.
 *
 * Migrado de `auth.http.test.mjs` a TypeScript con tipado estricto,
 * patrón AAA y convenciones estandarizadas.
 *
 * @module test/integration/auth.http.test
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { Express } from 'express'
import { AppServer } from '../../src/api/AppServer.js'
import { AuthController } from '../../src/api/http/controllers/AuthController.js'
import { TransactionController } from '../../src/api/http/controllers/TransactionController.js'
import { PermissionGuard } from '../../src/core/security/PermissionGuard.js'
import { TransactionMapper } from '../../src/core/transaction/TransactionMapper.js'
import { TransactionExecutor } from '../../src/core/transaction/TransactionExecutor.js'
import { TransactionOrchestrator } from '../../src/core/transaction/TransactionOrchestrator.js'
import { SecurityService } from '../../src/services/SecurityService.js'
import { createMockContainer } from '../_helpers/mock-container.js'
import type { IContainer } from '../../src/types/core.js'
import type { AppRequest } from '../../src/types/index.js'

// ─── Tipos internos ──────────────────────────────────────────────────────────

/** Permisos de perfil mockeados para el test */
interface ProfilePermissions {
    [profileId: number]: Record<string, string[]>
}

// ─── Datos de prueba ─────────────────────────────────────────────────────────

const MOCK_USER = {
    id: 1,
    username: 'TestUser',
    email: 'test@example.com',
    password_hash: '$2a$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    email_verified_at: new Date(),
    profile_id: 1,
} as const

const MOCK_PROFILE_PERMISSIONS: ProfilePermissions = {
    1: {
        Auth: [
            'register',
            'login',
            'logout',
            'requestEmailVerification',
            'verifyEmail',
            'requestPasswordReset',
            'verifyPasswordReset',
            'resetPassword',
        ],
        User: ['getProfile'],
    },
    2: {
        Auth: [
            'register',
            'requestEmailVerification',
            'verifyEmail',
            'requestPasswordReset',
            'verifyPasswordReset',
            'resetPassword',
        ],
    },
}

// ─── Factories ───────────────────────────────────────────────────────────────

/**
 * Construye un contenedor con servicios de seguridad reales
 * (PermissionGuard, TransactionMapper, etc.).
 *
 * @param deps - Dependencias base a inyectar
 * @returns Contenedor con seguridad configurada
 */
function buildSecurityContainer(deps: Record<string, unknown>): IContainer {
    const container = createMockContainer(deps)
    container.register('permissionGuard', new PermissionGuard(container))
    container.register('transactionMapper', new TransactionMapper(container))
    container.register('transactionExecutor', new TransactionExecutor(container))
    container.register('orchestrator', new TransactionOrchestrator(container))
    return container
}

/**
 * Crea las dependencias mock para el servidor de integración.
 *
 * Cada dependencia tiene tipado mínimo necesario para satisfacer
 * los contratos que AppServer y sus controladores esperan.
 *
 * @returns Objeto con todas las dependencias mock
 */
function createDeps() {
    const logs: Array<{ type: number; msg: unknown }> = []

    const log = {
        trace: () => {},
        debug: () => {},
        info: (msg: unknown) => logs.push({ type: 2, msg }),
        warn: (msg: unknown) => logs.push({ type: 3, msg }),
        error: (msg: unknown) => logs.push({ type: 1, msg }),
        critical: (msg: unknown) => logs.push({ type: 1, msg }),
        child: () => log,
    }

    const config = {
        app: {
            name: 'TestApp',
            port: 0,
            host: 'localhost',
            lang: 'en',
            env: 'test',
            frontendMode: 'none' as const,
            trustProxy: false as boolean | number | string | undefined,
        },
        auth: {
            publicProfileId: 2,
            sessionProfileId: 1,
            emailVerificationPurpose: 'ev',
            passwordResetPurpose: 'pr',
        },
        db: {},
        log: { activation: [true, true, true, true] },
        bo: { path: '../../BO/' },
        session: { secret: 'test-secret', resave: false, saveUninitialized: false },
        cors: {},
        email: {},
        websocket: { adapter: 'memory' as const },
    }

    const i18n: Record<string, unknown> = {
        get: (k: string) => {
            const map: Record<string, unknown> = {
                'errors.server': {
                    serverError: { code: 500, msg: 'Server Error' },
                    txNotFound: { msg: 'Tx {tx} not found' },
                },
                'errors.client': {
                    unknown: { code: 500 },
                    csrfInvalid: { code: 403, msg: 'CSRF Invalid' },
                    permissionDenied: { code: 403, msg: 'Denied' },
                    login: { code: 401, msg: 'Login Required' },
                    invalidParameters: { code: 400, msg: 'Invalid Params' },
                    serviceUnavailable: { code: 503, msg: 'Service Unavailable' },
                },
                success: { logout: { code: 200, msg: 'Logged out' } },
            }
            return map[k] ?? {}
        },
        get messages() {
            return {
                errors: {
                    server: {
                        serverError: { code: 500, msg: 'Server Error' },
                        txNotFound: { msg: 'Tx {tx} not found' },
                    },
                    client: {
                        unknown: { code: 500 },
                        csrfInvalid: { code: 403, msg: 'CSRF Invalid' },
                        permissionDenied: { code: 403, msg: 'Denied' },
                        login: { code: 401, msg: 'Login Required' },
                        invalidParameters: { code: 400, msg: 'Invalid Params' },
                        serviceUnavailable: { code: 503, msg: 'Service Unavailable' },
                    },
                },
                success: { logout: { code: 200, msg: 'Logged out' } },
                alerts: {
                    invalidBody: 'Invalid body',
                    invalidTx: 'Invalid tx',
                    paramsType: 'Invalid params',
                },
            }
        },
        translate: (k: string) => k,
        error: (k: string) => {
            const map: Record<string, { code: number; msg: string }> = {
                'errors.client.csrfInvalid': { code: 403, msg: 'CSRF Invalid' },
                'errors.client.permissionDenied': { code: 403, msg: 'Denied' },
            }
            return map[k] ?? { msg: k, code: 400 }
        },
        errorKey: () => ({ msg: 'Error', code: 500 }),
        use: () => ({ registerSuccess: 'Registered!', emailVerified: 'Verified!' }),
        format: (t: string) => t,
        currentLocale: 'es',
        formatDate: (d: Date | number) => String(d),
        formatCurrency: (a: number, c: string) => `${a} ${c}`,
    }

    const audit = { log: async () => {} }

    const sessionService = {
        sessionExists: (req: AppRequest) => !!(req.session as unknown as Record<string, unknown>)?.userId,
        authenticate: async (req: AppRequest) => {
            const body = req.body as { loginId?: string; password?: string }
            if (body.loginId === 'test@example.com' && body.password === 'password') {
                const session = req.session as unknown as Record<string, unknown>
                session.userId = 1
                session.profileId = 1
                return {
                    status: 'success' as const,
                    user: { id: 1, username: 'TestUser', email: body.loginId, profile_id: 1 },
                    msg: { code: 200, msg: 'Login OK' },
                }
            }
            return {
                status: 'error' as const,
                error: { code: 401, msg: 'Auth Failed' },
            }
        },
        destroySession: (req: AppRequest) => {
            (req.session as unknown as { destroy: (cb?: (err?: unknown) => void) => void }).destroy()
        },
    }

    const db = {
        pool: {},
        shutdown: async () => {},
        query: async (queryDef: string | { sql: string }, params?: unknown[]) => {
            const sql = typeof queryDef === 'string' ? queryDef : queryDef.sql

            // Permisos de perfil
            if (sql.includes('profile_method')) {
                const rows: Array<{ profile_id: number; object_name: string; method_name: string }> = []
                for (const [pid, perms] of Object.entries(MOCK_PROFILE_PERMISSIONS)) {
                for (const [obj, methods] of Object.entries(perms) as [string, string[]][]) {
                        for (const m of methods) {
                            rows.push({ profile_id: Number(pid), object_name: obj, method_name: m })
                        }
                    }
                }
                return { rows }
            }

            // Mapeo de transacciones
            if (sql.includes('security.methods')) {
                return {
                    rows: [
                        { tx: 101, object_name: 'Auth', method_name: 'register' },
                        { tx: 102, object_name: 'Auth', method_name: 'verifyEmail' },
                    ],
                }
            }

            // Auth queries
            if (sql.includes('WHERE u.user_email = $1')) {
                const p = params as string[]
                if (p[0] === 'test@example.com') return { rows: [MOCK_USER] }
                return { rows: [] }
            }
            if (sql.includes('INSERT INTO security.users')) return { rows: [{ user_id: 2 }] }
            if (sql.includes('INSERT INTO security.user_profile')) return { rows: [] }
            if (sql.includes('INSERT INTO security.one_time_codes')) return { rows: [{ id: 1 }] }

            return { rows: [] }
        },
    }

    const validator = {
        validate: <T>(d: unknown, _schema?: unknown) => ({ valid: true as const, data: d as T }),
    }

    const email = {
        send: async () => ({ ok: true, mode: 'log' }),
        sendTemplate: async () => ({ ok: true, mode: 'log' }),
        maskEmail: (e: string) => e,
    }

    const probeController = {
        health: (_req: unknown, res: { status: (c: number) => { send: (d: unknown) => void } }) =>
            res.status(200).send({ status: 'ok' }),
        ready: (_req: unknown, res: { status: (c: number) => { send: (d: unknown) => void } }) =>
            res.status(200).send({ status: 'ok' }),
    }

    return { config, log, i18n, audit, session: sessionService, db, logs, validator, email, probeController }
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Auth Module Integration (HTTP)', async () => {
    let app: Express
    let csrfToken: string

    before(async () => {
        // Arrange — crear servidor completo con dependencias mockeadas
        const deps = createDeps()

        const container = buildSecurityContainer({
            ...deps,
            validator: { validate: <T>(d: unknown) => ({ valid: true as const, data: d as T }) },
            email: {
                send: async () => ({ ok: true }),
                sendTemplate: async () => ({ ok: true }),
                maskEmail: (e: string) => e,
            },
        })

        const security = new SecurityService(container)
        container.register('security', security)
        await security.init()
        container.register('authController', new AuthController(container))
        container.register('txController', new TransactionController(container))
        container.register('probeController', deps.probeController)

        const appServer = new AppServer(container)
        await appServer.init()
        app = appServer.app
    })

    it('should return CSRF token when requesting /csrf', async () => {
        // Act
        const res = await request(app).get('/csrf')

        // Assert
        assert.equal(res.status, 200)
        assert.ok(res.body.csrfToken)
        csrfToken = res.body.csrfToken
    })

    it('should reject login without CSRF token (403)', async () => {
        // Act
        const res = await request(app)
            .post('/login')
            .send({ loginId: 'test@example.com', password: 'password' })

        // Assert
        assert.equal(res.status, 403)
    })

    it('should login with valid credentials and CSRF token', async () => {
        // Arrange
        const agent = request.agent(app)
        const csrfRes = await agent.get('/csrf')
        const token = csrfRes.body.csrfToken

        // Act
        const res = await agent
            .post('/login')
            .set('X-CSRF-Token', token)
            .send({ loginId: 'test@example.com', password: 'password' })

        // Assert
        assert.equal(res.status, 200)
        assert.equal(res.body.msg.msg, 'Login OK')
    })

    it('should register via /toProccess with tx 101 (Auth.register)', async () => {
        // Arrange
        const agent = request.agent(app)
        const csrfRes = await agent.get('/csrf')
        const token = csrfRes.body.csrfToken
        const payload = {
            tx: 101,
            params: {
                name: 'New User',
                email: 'new@example.com',
                password: 'password123',
                confirmPassword: 'password123',
            },
        }

        // Act
        const res = await agent
            .post('/toProccess')
            .set('X-CSRF-Token', token)
            .send(payload)

        // Assert
        assert.ok(
            res.status === 200 || res.status === 201,
            `Expected 200 or 201, got ${res.status}`
        )
        assert.ok(res.body.code === 200 || res.body.code === 201)
    })

    it('should logout after login', async () => {
        // Arrange — login primero
        const agent = request.agent(app)
        const csrfRes = await agent.get('/csrf')
        const token = csrfRes.body.csrfToken
        await agent
            .post('/login')
            .set('X-CSRF-Token', token)
            .send({ loginId: 'test@example.com', password: 'password' })

        // Act
        const res = await agent
            .post('/logout')
            .set('X-CSRF-Token', token)
            .send({})

        // Assert
        assert.equal(res.status, 200)
    })
})
