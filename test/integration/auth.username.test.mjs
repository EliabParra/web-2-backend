import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { AppServer } from '../../src/api/AppServer.js'
import { SecurityService } from '../../src/services/SecurityService.js'
import { createMockContainer } from '../_helpers/mock-container.mjs'

const MOCK_USER = {
    user_id: 1,
    username: 'TestUser',
    user_email: 'test@example.com',
    user_password: 'hash',
    user_email_verified_at: new Date(),
    profile_id: 1,
    user_is_active: true,
}

// Minimal deps
function createDeps() {
    const logs = []

    // Config mirroring standard setup
    const config = {
        app: {
            name: 'TestApp',
            port: 0,
            host: 'localhost',
            lang: 'en',
            frontendUrl: 'http://localhost:3000',
        },
        auth: { publicProfileId: 2, sessionProfileId: 1 },
        log: { activation: [true, true, true, true] },
        bo: { path: '../../BO/' },
        session: { secret: 'test-secret', resave: false, saveUninitialized: false },
    }

    const log = {
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: (m) => logs.push({ level: 'error', msg: m }),
        critical: () => {},
    }
    log.child = () => log

    return {
        config,
        log,
        i18n: {
            use: () => ({ usernameSent: 'Username sent' }),
            get: () => ({}),
            format: (s) => s,
            translate: (s) => s,
            messages: {
                errors: {
                    server: { serverError: { msg: 'Server Error' } },
                },
            },
        },
        audit: { log: async () => {} },
        session: {
            sessionExists: () => false,
            createSession: async () => ({ status: 'error' }),
            destroySession: () => {},
        },
        db: {
            query: async (q, p) => {
                const sql = typeof q === 'string' ? q : q.sql

                // Permission mocking
                if (sql.includes('profile_method')) {
                    return {
                        rows: [
                            { profile_id: 2, object_name: 'Auth', method_name: 'requestUsername' },
                        ],
                    }
                }

                // Method mapping mocking
                if (sql.includes('security.methods')) {
                    return {
                        rows: [{ tx: 101, object_name: 'Auth', method_name: 'requestUsername' }],
                    }
                }

                if (
                    sql.includes(
                        'SELECT user_id, username, user_email, user_password, user_email_verified_at'
                    ) &&
                    sql.includes('FROM security.users') &&
                    sql.includes('user_email = $1')
                ) {
                    if (p[0] === 'test@example.com') return { rows: [MOCK_USER] }
                    return { rows: [] }
                }
                return { rows: [] }
            },
        },
        email: {
            sendTemplate: async (opts) => {
                logs.push({ type: 'EMAIL', ...opts })
                return { ok: true }
            },
        },
        validator: { validate: (d) => ({ valid: true, data: d }) },
        logs,
    }
}

describe('Auth Username Recovery', async () => {
    let app
    let testDeps
    let csrfToken

    before(async () => {
        try {
            const deps = createDeps()
            testDeps = deps

            const security = new SecurityService(createMockContainer(deps))
            await security.init()

            const appServer = new AppServer(createMockContainer({ ...deps, security }))
            await appServer.init()
            app = appServer.app
        } catch (e) {
            console.error('Setup FAILS:', e)
            throw e
        }
    })

    it('Should execute requestUsername and send email', async () => {
        const agent = request.agent(app)
        const r1 = await agent.get('/csrf')
        csrfToken = r1.body.csrfToken

        // Execute via /toProccess with tx 101 (mapped to Auth.requestUsername)
        const payload = {
            tx: 101,
            params: { email: 'test@example.com' },
        }

        const res = await agent.post('/toProccess').set('X-CSRF-Token', csrfToken).send(payload)

        if (res.status !== 200) {
            console.error('Request failed:', res.status, res.body)
            console.error('Logs:', testDeps.logs)
        }
        assert.equal(res.status, 200)

        // Check logs for email
        const emailLog = testDeps.logs.find((l) => l.type === 'EMAIL')
        assert.ok(emailLog, 'Email should be sent')
        assert.equal(emailLog.to, 'test@example.com')
        assert.equal(emailLog.data.username, 'TestUser')
    })

    it('Should return success even if email not found (Silent Success)', async () => {
        const agent = request.agent(app)

        const payload = {
            tx: 101,
            params: { email: 'unknown@example.com' },
        }

        const res = await agent.post('/toProccess').set('X-CSRF-Token', csrfToken).send(payload)

        assert.equal(res.status, 200)

        const emailLog = testDeps.logs.find((l) => l.to === 'unknown@example.com')
        assert.equal(emailLog, undefined, 'Email should NOT be sent for unknown user')
    })
})
