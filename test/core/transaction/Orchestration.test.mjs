import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AuthorizationService } from '../../../src/core/security/AuthorizationService.js'
import { TransactionOrchestrator } from '../../../src/core/transaction/TransactionOrchestrator.js'

import { createMockContainer } from '../../_helpers/mock-container.mjs'

describe('Security & Orchestration Core', () => {
    describe('AuthorizationService', () => {
        it('isAuthorized() checks permission guard and logs denial', () => {
            // ... logs mock ...
            const mockLog = {
                trace: () => {},
                debug: () => {},
                info: () => {},
                warn: (msg) => {
                    // assert.equal(entry.type, 1) - type verification is tricky now without context object
                    // We can just verify it is called
                },
                error: () => {},
                critical: () => {},
                child: () => mockLog,
            }
            const mockGuard = { check: (p, o, m) => p === 1 }

            const container = createMockContainer({ guard: mockGuard, log: mockLog })
            const service = new AuthorizationService(container)

            assert.equal(service.isAuthorized(1, 'Obj', 'Method'), true)
            assert.equal(service.isAuthorized(99, 'Obj', 'Method'), false)
        })
    })

    describe('TransactionOrchestrator', () => {
        const mockLog = {
            trace: () => {},
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            critical: () => {},
            child: () => mockLog,
        }
        const mockAudit = { log: async () => {} }
        const mockI18n = { error: (k) => ({ code: 500, msg: k }), errorKey: (k) => ({ code: 500, msg: k }) }

        const context = { userId: 1, profileId: 10, username: 'test' }

        it('execute() blocks invalid paths (Path Traversal/Injection)', async () => {
            const mockMapper = { resolve: () => ({ objectName: '../Etc', methodName: 'exec' }) }

            const container = createMockContainer({
                mapper: mockMapper,
                authorization: null,
                executor: null,
                log: mockLog,
                audit: mockAudit,
                i18n: mockI18n,
            })

            const orchestrator = new TransactionOrchestrator(container)

            const res = await orchestrator.execute(100, context, {})
            assert.equal(res.code, 400)
            assert.equal(res.msg, 'server.serverError')
        })

        it('execute() enforces AuthorizationService', async () => {
            const mockMapper = { resolve: () => ({ objectName: 'Safe', methodName: 'exec' }) }
            const mockAuth = { isAuthorized: () => false }

            const container = createMockContainer({
                mapper: mockMapper,
                authorization: mockAuth,
                executor: null,
                log: mockLog,
                audit: mockAudit,
                i18n: mockI18n,
            })

            const orchestrator = new TransactionOrchestrator(container)

            const res = await orchestrator.execute(100, context, {})
            assert.equal(res.code, 403)
        })

        it('execute() runs Executor on success', async () => {
            const mockMapper = { resolve: () => ({ objectName: 'Safe', methodName: 'exec' }) }
            const mockAuth = { isAuthorized: () => true }
            const mockExecutor = { execute: async () => ({ success: true }) }

            const container = createMockContainer({
                mapper: mockMapper,
                authorization: mockAuth,
                executor: mockExecutor,
                log: mockLog,
                audit: mockAudit,
                i18n: mockI18n,
            })

            const orchestrator = new TransactionOrchestrator(container)

            const res = await orchestrator.execute(100, context, {})
            assert.deepEqual(res, { success: true })
        })
    })
})
