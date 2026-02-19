import { z } from 'zod'

/**
 * Esquema de configuración para WebSocket.
 *
 * Define el adaptador de transporte: `'memory'` para desarrollo local,
 * `'redis'` para alta disponibilidad multi-nodo en producción.
 */
export const WebsocketConfigSchema = z.object({
    adapter: z
        .enum(['memory', 'redis'])
        .default('memory')
        .describe('Adaptador de transporte: memory (dev) o redis (producción)'),
})
