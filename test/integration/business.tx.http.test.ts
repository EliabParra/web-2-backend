import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import type { Express } from 'express'
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

function buildSecurityContainer(deps: Record<string, unknown>): IContainer {
    const container = createMockContainer(deps)
    container.register('permissionGuard', new PermissionGuard(container))
    container.register('transactionMapper', new TransactionMapper(container))
    container.register('transactionExecutor', new TransactionExecutor(container))
    container.register('orchestrator', new TransactionOrchestrator(container))
    return container
}

function createDeps() {
    const log = {
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        critical: () => {},
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
        get: () => ({}),
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
        error: (k: string) => ({ msg: k, code: 400 }),
        errorKey: () => ({ msg: 'Error', code: 500 }),
        use: (set: Record<string, Record<string, string>>) => set.es,
        format: (t: string) => t,
        currentLocale: 'es',
        formatDate: (d: Date | number) => String(d),
        formatCurrency: (a: number, c: string) => `${a} ${c}`,
    }

    const audit = { log: async () => {} }

    const sessionService = {
        sessionExists: () => false,
        authenticate: async () => ({ status: 'error' as const, error: { code: 401, msg: 'Auth Failed' } }),
        destroySession: () => {},
    }

    const db = {
        pool: {
            connect: async () => ({
                query: async () => ({ rows: [], rowCount: 0 }),
                release: () => {},
            }),
        },
        shutdown: async () => {},
        query: async (queryDef: string | { sql: string }) => {
            const sql = typeof queryDef === 'string' ? queryDef : queryDef.sql

            if (sql.includes('profile_method')) {
                return {
                    rows: [
                        { profile_id: 2, object_na: 'Devolution', method_na: 'get' },
                        { profile_id: 2, object_na: 'Devolution', method_na: 'getAll' },
                        { profile_id: 2, object_na: 'Notification', method_na: 'get' },
                        { profile_id: 2, object_na: 'Notification', method_na: 'getAll' },
                        { profile_id: 2, object_na: 'Report', method_na: 'get' },
                        { profile_id: 2, object_na: 'Report', method_na: 'getAll' },
                    ],
                }
            }

            if (sql.includes('security.transaction')) {
                return {
                    rows: [
                        { tx: 20, object_na: 'Devolution', method_na: 'get' },
                        { tx: 21, object_na: 'Devolution', method_na: 'getAll' },
                        { tx: 66, object_na: 'Notification', method_na: 'get' },
                        { tx: 67, object_na: 'Notification', method_na: 'getAll' },
                        { tx: 99, object_na: 'Report', method_na: 'get' },
                        { tx: 100, object_na: 'Report', method_na: 'getAll' },
                    ],
                }
            }

            if (sql.includes('FROM business.notification n') && sql.includes('WHERE n.notification_id = $1')) {
                return {
                    rows: [
                        {
                            notification_id: 1,
                            notification_ty: 'warning',
                            notification_tit: 'Préstamo por vencer',
                            notification_msg: 'Tu préstamo vence mañana',
                            notification_dt: '2026-03-25T10:00:00.000Z',
                            user_id: 7,
                        },
                    ],
                }
            }

            if (sql.includes('FROM business.notification n') && sql.includes('LIMIT $5 OFFSET $6')) {
                return {
                    rows: [
                        {
                            notification_id: 1,
                            notification_ty: 'warning',
                            notification_tit: 'Préstamo por vencer',
                            notification_dt: '2026-03-25T10:00:00.000Z',
                            user_id: 7,
                        },
                        {
                            notification_id: 2,
                            notification_ty: 'info',
                            notification_tit: 'Devolución registrada',
                            notification_dt: '2026-03-24T08:00:00.000Z',
                            user_id: 7,
                        },
                    ],
                }
            }

            if (sql.includes('FROM business.movement_type') && sql.includes('movement_type_de')) {
                return { rows: [{ movement_type_id: 4 }] }
            }

            if (sql.includes('AS active_loans') && sql.includes('AS overdue_loans')) {
                return {
                    rows: [
                        {
                            user_id: 7,
                            active_loans: 1,
                            overdue_loans: 0,
                            borrowed_items: 3,
                        },
                    ],
                }
            }

            if (sql.includes('COUNT(*)::int AS total_events') && sql.includes('business.devolution_status')) {
                return {
                    rows: [
                        {
                            total_events: 2,
                            completed_events: 1,
                            partial_events: 1,
                            damaged_events: 0,
                        },
                    ],
                }
            }

            if (sql.includes('COALESCE(SUM(CASE WHEN ds.devolution_status_de =')) {
                return {
                    rows: [
                        {
                            movement_id: 300,
                            user_id: 7,
                            movement_booking_dt: '2026-03-20T00:00:00.000Z',
                            movement_estimated_return_dt: '2026-03-27T00:00:00.000Z',
                            movement_type_id: 4,
                            movement_type_de: 'Loaned',
                            lapse_id: 2,
                            lapse_de: '2026-I',
                            total_items: 2,
                            returned_items: 1,
                            pending_items: 1,
                            damaged_items: 0,
                        },
                    ],
                }
            }

            if (sql.includes('findDetailsWithLatestStatusByMovementId') || sql.includes('FROM business.movement_detail md')) {
                return {
                    rows: [
                        {
                            movement_detail_id: 900,
                            inventory_id: 123,
                            movement_detail_am: 2,
                            movement_detail_ob: null,
                            returned_am: 1,
                            pending_am: 1,
                            devolution_status_de: 'partial',
                            devolution_status_dt: '2026-03-25T09:00:00.000Z',
                            devolution_status_ob: null,
                        },
                    ],
                }
            }

            return { rows: [] }
        },
    }

    const validator = {
        validate: <T>(d: unknown) => ({ valid: true as const, data: d as T }),
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

    return { config, log, i18n, audit, session: sessionService, db, validator, email, probeController }
}

describe('Business TX Integration (HTTP)', async () => {
    let app: Express

    before(async () => {
        const deps = createDeps()
        const container = buildSecurityContainer(deps)

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

    it('executes tx 67 (Notification.getAll)', async () => {
        const agent = request.agent(app)
        const csrfRes = await agent.get('/csrf')
        const token = csrfRes.body.csrfToken as string

        const res = await agent
            .post('/toProccess')
            .set('X-CSRF-Token', token)
            .send({ tx: 67, params: { user_id: 7, limit: 10, offset: 0 } })

        assert.equal(res.status, 200)
        assert.ok(Array.isArray(res.body.data))
        assert.equal(res.body.data.length, 2)
        assert.equal(res.body.data[0].notification_id, 1)
    })

    it('executes tx 66 (Notification.get)', async () => {
        const agent = request.agent(app)
        const csrfRes = await agent.get('/csrf')
        const token = csrfRes.body.csrfToken as string

        const res = await agent
            .post('/toProccess')
            .set('X-CSRF-Token', token)
            .send({ tx: 66, params: { id: 1 } })

        assert.equal(res.status, 200)
        assert.equal(res.body.data.notification_id, 1)
        assert.equal(res.body.data.user_id, 7)
    })

    it('executes tx 100 (Report.getAll)', async () => {
        const agent = request.agent(app)
        const csrfRes = await agent.get('/csrf')
        const token = csrfRes.body.csrfToken as string

        const res = await agent
            .post('/toProccess')
            .set('X-CSRF-Token', token)
            .send({ tx: 100, params: {} })

        assert.equal(res.status, 200)
        assert.ok(Array.isArray(res.body.data))
        assert.ok(res.body.data.some((row: { report_ty: string }) => row.report_ty === 'solvency'))
    })

    it('executes tx 99 (Report.get)', async () => {
        const agent = request.agent(app)
        const csrfRes = await agent.get('/csrf')
        const token = csrfRes.body.csrfToken as string

        const res = await agent
            .post('/toProccess')
            .set('X-CSRF-Token', token)
            .send({ tx: 99, params: { id: 2 } })

        assert.equal(res.status, 200)
        assert.equal(res.body.data.report_ty, 'solvency')
        assert.ok(Array.isArray(res.body.data.data))
        assert.equal(res.body.data.data[0].user_id, 7)
    })

    it('executes tx 21 (Devolution.getAll)', async () => {
        const agent = request.agent(app)
        const csrfRes = await agent.get('/csrf')
        const token = csrfRes.body.csrfToken as string

        const res = await agent
            .post('/toProccess')
            .set('X-CSRF-Token', token)
            .send({ tx: 21, params: { user_id: 7 } })

        assert.equal(res.status, 200)
        assert.ok(Array.isArray(res.body.data))
        assert.equal(res.body.data[0].movement_id, 300)
    })

    it('executes tx 20 (Devolution.get)', async () => {
        const agent = request.agent(app)
        const csrfRes = await agent.get('/csrf')
        const token = csrfRes.body.csrfToken as string

        const res = await agent
            .post('/toProccess')
            .set('X-CSRF-Token', token)
            .send({ tx: 20, params: { id: 300 } })

        assert.equal(res.status, 200)
        assert.equal(res.body.data.movement_id, 300)
        assert.ok(Array.isArray(res.body.data.details))
    })
})
