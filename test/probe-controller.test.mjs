import test from 'node:test'
import assert from 'node:assert/strict'
import { ProbeController } from '../src/api/http/controllers/ProbeController.js'
import { createMockContainer } from './_helpers/mock-container.mjs'

test('ProbeController.health returns 200 with uptime', () => {
    const container = createMockContainer({
        security: {},
        config: { app: { name: 'test-app' } },
    })
    const controller = new ProbeController(container)

    // Mock Request/Response
    const req = { requestId: 'req-1' }
    let statusCode = null
    let sentData = null
    const res = {
        status: (code) => {
            statusCode = code
            return res
        },
        send: (data) => {
            sentData = data
            return res
        },
    }

    controller.health(req, res)

    assert.equal(statusCode, 200)
    assert.equal(sentData.ok, true)
    assert.equal(sentData.name, 'test-app')
    assert.equal(sentData.requestId, 'req-1')
    assert.ok(typeof sentData.uptimeSec === 'number')
})

test('ProbeController.ready returns 200 when security is ready', async () => {
    const mockSecurity = { isReady: true }
    const container = createMockContainer({
        security: mockSecurity,
        config: { app: { name: 'test-app' } },
    })
    const controller = new ProbeController(container)

    let statusCode = null
    let sentData = null
    const res = {
        status: (code) => {
            statusCode = code
            return res
        },
        send: (data) => {
            sentData = data
            return res
        },
    }

    await controller.ready({}, res)

    assert.equal(statusCode, 200)
    assert.equal(sentData.status, 'ok')
})

test('ProbeController.ready returns 503 when security is NOT ready', async () => {
    const mockSecurity = { isReady: false }
    const container = createMockContainer({
        security: mockSecurity,
        config: { app: { name: 'test-app' } },
    })
    const controller = new ProbeController(container)

    let statusCode = null
    let sentData = null
    const res = {
        status: (code) => {
            statusCode = code
            return res
        },
        send: (data) => {
            sentData = data
            return res
        },
    }

    await controller.ready({}, res)

    assert.equal(statusCode, 503)
    assert.equal(sentData.status, 'starting')
})
