import { z } from 'zod'
import { NotificationMessages } from './NotificationMessages.js'

/**
 * Schemas Zod para métodos de NotificationBO (Playground WebSocket)
 */
export type NotificationMessagesSet = typeof NotificationMessages.es

export const createNotificationSchemas = (messages: NotificationMessagesSet = NotificationMessages.es) => {
    const validation = messages.validation ?? NotificationMessages.es.validation

    return {
        send: z.object({
            userId: z.string().min(1, validation.requiredField),
            event: z.string().min(1, validation.requiredField),
            message: z.string().min(1, validation.requiredField),
        }),
        broadcast: z.object({
            event: z.string().min(1, validation.requiredField),
            message: z.string().min(1, validation.requiredField),
        }),
        simulate: z.object({
            userId: z.string().min(1, validation.requiredField),
            steps: z.number().int().min(3).max(20).default(8),
            delayMs: z.number().int().min(200).max(5000).default(600),
        }),
    }
}

export const NotificationSchemas = createNotificationSchemas(NotificationMessages.es)

export type SendInput = z.infer<typeof NotificationSchemas.send>
export type BroadcastInput = z.infer<typeof NotificationSchemas.broadcast>
export type SimulateInput = z.infer<typeof NotificationSchemas.simulate>
