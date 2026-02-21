import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { WebSocketService } from '../../src/services/WebSocketService.js'
import { createMockContainer } from '../_helpers/mock-container.mjs'

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const mockLog = {
    child: () => mockLog,
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trace: () => {},
}

const defaultExpressApp = { _router: { stack: [] } }

function createConfig(adapter = 'memory') {
    return {
        websocket: { adapter },
    }
}

function createService(overrides = {}) {
    const container = createMockContainer({
        log: mockLog,
        config: createConfig('memory'),
        expressApp: defaultExpressApp,
        ...overrides,
    })
    return new WebSocketService(container)
}

async function createInitializedService(overrides = {}) {
    const server = http.createServer()
    const service = createService(overrides)
    await service.initialize(server)
    return { service, server }
}

function closeServer(server) {
    return new Promise((resolve) => {
        server.close(() => resolve())
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests: Inicialización y Adaptador
// ═══════════════════════════════════════════════════════════════════════════════

test('WebSocketService inicializa con adaptador memory por defecto', async () => {
    const { service, server } = await createInitializedService()

    assert.equal(service.getLocalConnectionsCount(), 0)

    await service.shutdown()
    await closeServer(server)
})

test('WebSocketService lanza error si se usan métodos sin inicializar', () => {
    const service = createService()

    assert.throws(() => service.emitToUser('1', 'test', {}), { message: /no inicializado/ })
    assert.throws(() => service.broadcast('test', {}), { message: /no inicializado/ })
    assert.throws(() => service.emitToRoom('room', 'test', {}), { message: /no inicializado/ })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Tests: Mapa Local de Conexiones
// ═══════════════════════════════════════════════════════════════════════════════

test('WebSocketService getLocalConnectionsCount retorna 0 sin conexiones', async () => {
    const { service, server } = await createInitializedService()

    assert.equal(service.getLocalConnectionsCount(), 0)

    await service.shutdown()
    await closeServer(server)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Tests: Métodos de Emisión (sin conexiones)
// ═══════════════════════════════════════════════════════════════════════════════

test('WebSocketService.emitToUser no falla sin sockets conectados', async () => {
    const { service, server } = await createInitializedService()

    assert.doesNotThrow(() => service.emitToUser('999', 'event', { data: true }))

    await service.shutdown()
    await closeServer(server)
})

test('WebSocketService.broadcast no falla sin sockets conectados', async () => {
    const { service, server } = await createInitializedService()

    assert.doesNotThrow(() => service.broadcast('global', { msg: 'hello' }))

    await service.shutdown()
    await closeServer(server)
})

test('WebSocketService.emitToRoom no falla sin sockets conectados', async () => {
    const { service, server } = await createInitializedService()

    assert.doesNotThrow(() => service.emitToRoom('room_test', 'roomEvent', {}))

    await service.shutdown()
    await closeServer(server)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Tests: Rooms sin conexiones
// ═══════════════════════════════════════════════════════════════════════════════

test('WebSocketService.addUserToRoom no falla para usuario sin conexiones', async () => {
    const { service, server } = await createInitializedService()

    assert.doesNotThrow(() => service.addUserToRoom('unknown_user', 'room_test'))

    await service.shutdown()
    await closeServer(server)
})

test('WebSocketService.removeUserFromRoom no falla para usuario sin conexiones', async () => {
    const { service, server } = await createInitializedService()

    assert.doesNotThrow(() => service.removeUserFromRoom('unknown_user', 'room_test'))

    await service.shutdown()
    await closeServer(server)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Tests: Shutdown
// ═══════════════════════════════════════════════════════════════════════════════

test('WebSocketService.shutdown limpia recursos correctamente', async () => {
    const { service, server } = await createInitializedService()

    await service.shutdown()
    assert.equal(service.getLocalConnectionsCount(), 0)

    await closeServer(server)
})

test('WebSocketService.shutdown es seguro llamar múltiples veces', async () => {
    const { service, server } = await createInitializedService()

    await service.shutdown()
    await assert.doesNotReject(() => service.shutdown())

    await closeServer(server)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Tests: Integración con Socket.io Client
// ═══════════════════════════════════════════════════════════════════════════════

test('WebSocketService desconecta sockets sin userId en sesión', async () => {
    const { service, server } = await createInitializedService()

    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port

    const { io: ioClient } = await import('socket.io-client')
    const client = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        reconnection: false,
    })

    try {
        const disconnected = await new Promise((resolve) => {
            client.on('disconnect', () => resolve(true))
            client.on('connect_error', () => resolve(true))
            setTimeout(() => resolve(false), 3000)
        })
        assert.ok(disconnected, 'Socket sin sesión debería ser desconectado')
    } finally {
        client.disconnect()
        await service.shutdown()
        await closeServer(server)
    }
})

test('WebSocketService acepta conexiones con sesión autenticada y registra en localConnections', async () => {
    const sessionMiddleware = (req, _res, next) => {
        req.session = { userId: 42 }
        next()
    }

    const { service, server } = await createInitializedService({
        sessionMiddleware,
    })

    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port

    const { io: ioClient } = await import('socket.io-client')
    const client = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        reconnection: false,
    })

    try {
        const connected = await new Promise((resolve) => {
            client.on('connect', () => resolve(true))
            client.on('connect_error', () => resolve(false))
            setTimeout(() => resolve(false), 3000)
        })

        assert.equal(connected, true, 'Cliente con sesión debería conectarse')
        assert.equal(
            service.getLocalConnectionsCount(),
            1,
            'Debería registrar 1 usuario en localConnections'
        )
    } finally {
        client.disconnect()
        // Esperar a que el evento disconnect se procese
        await new Promise((resolve) => setTimeout(resolve, 100))
        await service.shutdown()
        await closeServer(server)
    }
})
