import cors from 'cors'
import { IConfig } from '../../../types/index.js'
import { Express } from 'express'

/**
 * Aplica configuración de CORS si está habilitada en la configuración.
 *
 * Valida el origen contra una lista blanca (`config.cors.origins`) para seguridad estricta.
 * Configura métodos permitidos, credenciales y headers expuestos seguramenete.
 *
 */
export function applyCorsIfEnabled(app: Express, config: IConfig) {
    if (!config.cors?.enabled) return

    const allowedOrigins = Array.isArray(config.cors.origins) ? config.cors.origins : []

    app.use(
        cors({
            origin: (
                origin: string | undefined,
                callback: (err: Error | null, allow?: boolean) => void
            ) => {
                // Permitir requests sin origin (ej. llamadas Server-to-Server, curl, REST clients)
                if (!origin) return callback(null, true)
                // Permitir explícitamente orígenes configurados
                if (allowedOrigins.includes(origin)) return callback(null, true)

                // En desarrollo, permitir dinámicamente cualquier origen de red local (ej: celular testeando backend local)
                if (config.app.env === 'development') {
                    try {
                        const url = new URL(origin)
                        const hostname = url.hostname
                        const isLocalNetwork =
                            hostname === 'localhost' ||
                            hostname === '127.0.0.1' ||
                            hostname.startsWith('192.168.') ||
                            hostname.startsWith('10.') ||
                            hostname.startsWith('172.16.') ||
                            hostname.startsWith('172.31.')

                        if (isLocalNetwork) {
                            return callback(null, true)
                        }
                    } catch (e) {
                        // Origen mal formado, ignoramos y denegamos
                    }
                }

                return callback(new Error(`CORS origin not allowed: ${origin}`))
            },
            credentials: Boolean(config.cors.credentials),
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'X-Request-Id', 'X-CSRF-Token'],
            exposedHeaders: ['X-Request-Id'],
            optionsSuccessStatus: 204,
        })
    )
}
