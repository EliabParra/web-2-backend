/**
 * Punto de entrada principal de la aplicación.
 *
 * Inicializa los servicios core y configura el manejo de señales de cierre.
 *
 * @module index
 */
import { appServer, log, security } from './foundation.js'

try {
    log.info('--> Iniciando SecurityService...')
    await security.init()
    log.info('--> SecurityService Iniciado.')

    log.info('--> Iniciando AppServer...')
    await appServer.init()
    log.info('--> AppServer Iniciado.')

    appServer.serverOn()
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
