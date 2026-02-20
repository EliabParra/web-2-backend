import { BaseBO, ApiResponse, IContainer, IWebSocketService } from '../../src/core/business-objects/index.js'
import { NotificationMessages, NotificationSchemas, Inputs, registerNotification } from './NotificationModule.js'

/**
 * Business Object de prueba para el Playground de WebSocket.
 *
 * Demuestra el patrón Fire & Forget y la simulación
 * de envío progresivo (chunks) via WebSocket.
 */
export class NotificationBO extends BaseBO {
    private ws: IWebSocketService

    constructor(container: IContainer) {
        super(container)
        registerNotification(container)
        this.ws = container.resolve<IWebSocketService>('websocket')
        this.log.child({ bo: 'NotificationBO' })
    }

    private get notificationMessages() {
        return this.i18n.use(NotificationMessages)
    }

    /**
     * Envía una notificación a un usuario específico.
     * Usa `emitToUser` (Fire & Forget — sin await).
     */
    async send(params: Inputs.SendInput): Promise<ApiResponse> {
        return this.exec<Inputs.SendInput, any>(
            params,
            NotificationSchemas.send,
            async (data) => {
                this.log.debug('emitToUser', { userId: data.userId, event: data.event })

                this.ws.emitToUser(data.userId, data.event, {
                    message: data.message,
                    timestamp: new Date().toISOString(),
                })

                return this.success(
                    { sent: true, userId: data.userId, event: data.event },
                    this.notificationMessages.send
                )
            }
        )
    }

    /**
     * Envía un broadcast a todos los clientes conectados.
     * Usa `broadcast` (Fire & Forget — sin await).
     */
    async broadcast(params: Inputs.BroadcastInput): Promise<ApiResponse> {
        return this.exec<Inputs.BroadcastInput, any>(
            params,
            NotificationSchemas.broadcast,
            async (data) => {
                this.log.debug('broadcast', { event: data.event })

                this.ws.broadcast(data.event, {
                    message: data.message,
                    timestamp: new Date().toISOString(),
                })

                return this.success(
                    { broadcasted: true, event: data.event },
                    this.notificationMessages.broadcast
                )
            }
        )
    }

    /**
     * Simula un proceso largo enviando chunks de progreso al usuario.
     *
     * El método retorna inmediatamente (HTTP 200) pero lanza
     * un ciclo asíncrono que emite `progress:update` al usuario
     * con porcentaje incremental hasta llegar a 100%.
     */
    async simulate(params: Inputs.SimulateInput): Promise<ApiResponse> {
        return this.exec<Inputs.SimulateInput, any>(
            params,
            NotificationSchemas.simulate,
            async (data) => {
                const { userId, steps, delayMs } = data
                const taskId = `task_${Date.now()}`

                this.log.debug('simulate started', { userId, steps, delayMs, taskId })

                const labels = [
                    'Inicializando entorno…',
                    'Conectando a servicios externos…',
                    'Cargando dependencias…',
                    'Validando configuración…',
                    'Procesando datos de entrada…',
                    'Aplicando transformaciones…',
                    'Ejecutando reglas de negocio…',
                    'Generando resultados parciales…',
                    'Optimizando salida…',
                    'Sincronizando con base de datos…',
                    'Verificando integridad…',
                    'Comprimiendo payload…',
                    'Aplicando políticas de seguridad…',
                    'Preparando respuesta…',
                    'Enviando notificaciones…',
                    'Actualizando caché…',
                    'Registrando auditoría…',
                    'Limpiando recursos temporales…',
                    'Finalizando transacción…',
                    'Proceso completado ✅',
                ]

                // Fire & Forget — el ciclo corre en background
                this.runProgressLoop(userId, taskId, steps, delayMs, labels)

                return this.success(
                    { taskId, steps, delayMs, userId },
                    this.notificationMessages.simulate
                )
            }
        )
    }

    /**
     * Ejecuta el ciclo de progreso en background.
     * Cada iteración emite un evento `progress:update` al usuario.
     */
    private runProgressLoop(
        userId: string,
        taskId: string,
        steps: number,
        delayMs: number,
        labels: string[]
    ): void {
        let current = 0

        const interval = setInterval(() => {
            current++
            const percent = Math.round((current / steps) * 100)
            const label = labels[(current - 1) % labels.length]
            const status = current >= steps ? 'completed' : 'in_progress'

            this.log.debug('chunk emitted', {
                taskId, step: current, totalSteps: steps, percent, label,
            })

            this.ws.emitToUser(userId, 'progress:update', {
                taskId,
                step: current,
                totalSteps: steps,
                percent,
                label,
                status,
                timestamp: new Date().toISOString(),
            })

            if (current >= steps) {
                clearInterval(interval)
                this.log.debug('simulate complete', { taskId })
            }
        }, delayMs)
    }

    /**
     * Agrega al usuario actual a una sala específica de WebSocket.
     */
    async joinRoom(params: Inputs.JoinRoomInput): Promise<ApiResponse> {
        return this.exec<Inputs.JoinRoomInput, any>(
            params,
            NotificationSchemas.joinRoom,
            async (data) => {
                this.log.debug('joinRoom', { userId: data.userId, roomName: data.roomName })
                this.ws.addUserToRoom(data.userId.toString(), data.roomName, data.namespace)

                return this.success(
                    { joined: true, userId: data.userId, roomName: data.roomName },
                    this.notificationMessages.joinRoom
                )
            }
        )
    }

    /**
     * Elimina al usuario actual de una sala específica de WebSocket.
     */
    async leaveRoom(params: Inputs.LeaveRoomInput): Promise<ApiResponse> {
        return this.exec<Inputs.LeaveRoomInput, any>(
            params,
            NotificationSchemas.leaveRoom,
            async (data) => {
                this.log.debug('leaveRoom', { userId: data.userId, roomName: data.roomName })
                this.ws.removeUserFromRoom(data.userId.toString(), data.roomName, data.namespace)

                return this.success(
                    { left: true, userId: data.userId, roomName: data.roomName },
                    this.notificationMessages.leaveRoom
                )
            }
        )
    }

    /**
     * Emite un evento directamente a todos los miembros de una sala.
     */
    async emitRoom(params: Inputs.EmitRoomInput): Promise<ApiResponse> {
        return this.exec<Inputs.EmitRoomInput, any>(
            params,
            NotificationSchemas.emitRoom,
            async (data) => {
                this.log.debug('emitRoom', { roomName: data.roomName, event: data.event })

                this.ws.emitToRoom(data.roomName, data.event, {
                    message: data.message,
                    from: data.userId,
                    timestamp: new Date().toISOString(),
                }, data.namespace)

                return this.success(
                    { emitted: true, roomName: data.roomName, event: data.event },
                    this.notificationMessages.emitRoom
                )
            }
        )
    }
}
