/**
 * Punto de entrada principal de la aplicación.
 *
 * Inicializa los servicios core y configura el manejo de señales de cierre.
 *
 * @module index
 */
import { appServer, log, security } from './foundation.js'

const logger = log.child({ category: 'Main' })

try {
    logger.info('--> Iniciando SecurityService...')
    await security.init()
    logger.info('--> SecurityService Iniciado.')

    logger.info('--> Iniciando AppServer...')
    await appServer.init()
    logger.info('--> AppServer Iniciado.')

    appServer.serverOn()
} catch (error) {
    console.error('FATAL STARTUP ERROR:', error)
    if (error instanceof Error) {
        logger.error(`Startup failed: ${error.message}`, error)
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
        logger.info(`Cerrando aplicación (${signal})...`)
        await appServer.shutdown()
        process.exit(0)
    } catch (err: unknown) {
        try {
            const message = err instanceof Error ? err.message : String(err)
            logger.error(`Error en cierre: ${message}`)
        } catch {
            // Silenciar errores en el logger durante cierre
        }
        process.exit(1)
    }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
