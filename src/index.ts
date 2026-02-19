/**
 * Punto de entrada principal de la aplicación.
 *
 * Inicializa los servicios core y configura el manejo de señales de cierre.
 * Todas las dependencias se resuelven desde el contenedor IoC.
 *
 * @module index
 */
import { container } from './foundation.js'
import type { ILogger, ISecurityService, IWebSocketService } from './types/index.js'
import type { AppServer } from './api/AppServer.js'

const log = container.resolve<ILogger>('log').child({ category: 'Main' })


try {
    log.trace('Iniciando SecurityService...')
    const security = container.resolve<ISecurityService>('security')
    await security.init()
    log.info('SecurityService Iniciado.')

    log.trace('Iniciando AppServer...')
    const appServer = container.resolve<AppServer>('appServer')
    await appServer.init()
    log.info('AppServer Iniciado.')

    const server = appServer.serverOn()

    log.trace('Iniciando WebSocketService...')
    const websocket = container.resolve<IWebSocketService>('websocket')
    await websocket.initialize(server)
    log.info('WebSocketService Iniciado.')
} catch (error) {
    console.error('FATAL STARTUP ERROR:', error)
    if (error instanceof Error) {
        log.error(`Startup failed: ${error.message}`, error)
    }
    process.exit(1)
}

// Manejo de cierre graceful
let shuttingDown = false

/**
 * Ejecuta el proceso de cierre de la aplicación.
 *
 * @param signal - Señal recibida (SIGINT, SIGTERM)
 */
async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return
    shuttingDown = true
    try {
        log.info(`Cerrando aplicación (${signal})...`)
        const websocket = container.resolve<IWebSocketService>('websocket')
        await websocket.shutdown()
        const appServer = container.resolve<AppServer>('appServer')
        await appServer.shutdown()
        process.exit(0)
    } catch (err: unknown) {
        try {
            const message = err instanceof Error ? err.message : String(err)
            log.error(`Error en cierre: ${message}`)
        } catch {
            // Silenciar errores en el logger durante cierre
        }
        process.exit(1)
    }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
