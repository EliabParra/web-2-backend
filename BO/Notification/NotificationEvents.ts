/**
 * Eventos de WebSocket controlados por el servidor.
 *
 * Nunca se aceptan del cliente — el BO decide
 * internamente qué evento emitir.
 */
export const NotificationEvents = {
    SEND: 'notification:send',
    BROADCAST: 'notification:broadcast',
    ROOM_MESSAGE: 'room:message',
    PROGRESS_UPDATE: 'progress:update',
} as const

export type NotificationEvent = (typeof NotificationEvents)[keyof typeof NotificationEvents]
