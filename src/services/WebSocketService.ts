import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import type { IWebSocketService, IContainer, ILogger, IConfig } from '../types/index.js'
import type { Express } from 'express'

/**
 * Servicio WebSocket con Arquitectura Híbrida.
 *
 * Soporta dos modos de transporte configurables:
 * - **memory**: Adaptador en memoria para desarrollo local (single-node).
 * - **redis**: Adaptador Redis Pub/Sub para alta disponibilidad multi-nodo.
 *
 * El enrutamiento se delega a las Salas nativas de Socket.io:
 * cada socket hace `join('user_{userId}')` al conectarse,
 * y emisiones usan `io.to('user_{userId}').emit(...)`.
 *
 * Mantiene un diccionario local (`localConnections`) exclusivamente para
 * tracking y métricas del nodo físico. Se limpia en `disconnect`.
 */
export class WebSocketService implements IWebSocketService {
    private readonly log: ILogger
    private readonly config: IConfig
    private readonly container: IContainer

    private io: SocketServer | null = null
    private pubClient: Redis | null = null
    private subClient: Redis | null = null

    /**
     * Mapa local de conexiones: userId → Set de socketIds.
     * Exclusivo para métricas del nodo; no se usa para enrutamiento.
     */
    private readonly localConnections = new Map<string, Set<string>>()

    constructor(container: IContainer) {
        this.container = container
        this.config = container.resolve<IConfig>('config')
        this.log = container.resolve<ILogger>('log').child({ category: 'WebSocket' })
    }

    /**
     * Inicializa el servidor WebSocket sobre el servidor HTTP existente.
     * Configura el adaptador según `config.websocket.adapter`.
     *
     * @param httpServer - Instancia del servidor HTTP de Node.js
     */
    async initialize(httpServer: any): Promise<void> {
        const corsOrigins = this.config.cors?.origins ?? ['*']

        this.io = new SocketServer(httpServer, {
            cors: {
                origin: corsOrigins,
                credentials: true,
            },
        })

        await this.configureAdapter()
        this.applySessionMiddleware()
        this.registerConnectionHandlers()

        this.log.info(`WebSocket inicializado con adaptador: ${this.config.websocket.adapter}`)
    }

    /**
     * Emite un evento a todas las conexiones de un usuario.
     *
     * @param userId - Identificador único del usuario
     * @param event - Nombre del evento
     * @param payload - Datos del evento
     */
    emitToUser(userId: string, event: string, payload: any): void {
        this.requireIO().to(`user_${userId}`).emit(event, payload)
    }

    /**
     * Emite un evento a todos los clientes conectados.
     *
     * @param event - Nombre del evento
     * @param payload - Datos del evento
     */
    broadcast(event: string, payload: any): void {
        this.requireIO().emit(event, payload)
    }

    /**
     * Emite un evento a todos los miembros de una sala.
     *
     * @param roomName - Nombre de la sala destino
     * @param event - Nombre del evento
     * @param payload - Datos del evento
     */
    emitToRoom(roomName: string, event: string, payload: any): void {
        this.requireIO().to(roomName).emit(event, payload)
    }

    /**
     * Agrega todas las conexiones de un usuario a una sala.
     *
     * @param userId - Identificador del usuario
     * @param roomName - Nombre de la sala
     */
    addUserToRoom(userId: string, roomName: string): void {
        const sockets = this.localConnections.get(userId)
        if (!sockets) return

        for (const socketId of sockets) {
            const socket = this.requireIO().sockets.sockets.get(socketId)
            socket?.join(roomName)
        }
    }

    /**
     * Remueve todas las conexiones de un usuario de una sala.
     *
     * @param userId - Identificador del usuario
     * @param roomName - Nombre de la sala
     */
    removeUserFromRoom(userId: string, roomName: string): void {
        const sockets = this.localConnections.get(userId)
        if (!sockets) return

        for (const socketId of sockets) {
            const socket = this.requireIO().sockets.sockets.get(socketId)
            socket?.leave(roomName)
        }
    }

    /**
     * Retorna el conteo de usuarios con conexiones activas en este nodo.
     */
    getLocalConnectionsCount(): number {
        return this.localConnections.size
    }

    /**
     * Cierra el servidor WebSocket y libera recursos.
     * Desconecta clientes y cierra conexiones Redis si aplica.
     */
    async shutdown(): Promise<void> {
        await this.closeIO()
        await this.closeRedisClients()
        this.localConnections.clear()
        this.log.info('WebSocket cerrado correctamente')
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Métodos Privados
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Aplica el middleware de `express-session` al handshake de Socket.io.
     * Rechaza conexiones sin sesión autenticada (userId ausente).
     */
    private applySessionMiddleware(): void {
        const app = this.container.resolve<Express>('expressApp')
        const sessionMiddleware = this.findSessionMiddleware(app)

        if (!sessionMiddleware) {
            this.log.warn('No se encontró middleware de sesión en Express. WebSocket operará sin autenticación.')
            return
        }

        this.requireIO().engine.use(sessionMiddleware)

        this.requireIO().use((socket, next) => {
            const session = (socket.request as any)?.session
            const userId = session?.userId ?? session?.user_id
            if (!userId) {
                next(new Error('Conexión WebSocket rechazada: sesión no autenticada'))
                return
            }
            next()
        })
    }

    /**
     * Busca el middleware de sesión registrado en la pila de Express.
     * Identifica express-session por el nombre interno `session`.
     *
     * @param app - Instancia de Express
     * @returns Middleware de sesión o `null` si no se encontró
     */
    private findSessionMiddleware(app: Express): any {
        const stack: any[] = (app as any)._router?.stack ?? []
        const sessionLayer = stack.find(
            (layer: any) => layer.name === 'session' && typeof layer.handle === 'function'
        )
        return sessionLayer?.handle ?? null
    }

    /**
     * Configura el adaptador de transporte según la configuración activa.
     * Si es `'redis'`, crea pubClient y subClient con manejo de errores.
     */
    private async configureAdapter(): Promise<void> {
        if (this.config.websocket.adapter !== 'redis') return

        this.pubClient = new Redis()
        this.subClient = this.pubClient.duplicate()

        this.pubClient.on('error', (err) => this.log.error('Redis pubClient error', err))
        this.subClient.on('error', (err) => this.log.error('Redis subClient error', err))

        await Promise.all([this.waitForConnection(this.pubClient), this.waitForConnection(this.subClient)])

        this.requireIO().adapter(createAdapter(this.pubClient, this.subClient))
        this.log.info('Adaptador Redis Pub/Sub configurado')
    }

    /**
     * Espera a que un cliente Redis establezca conexión.
     *
     * @param client - Instancia de Redis a esperar
     */
    private waitForConnection(client: Redis): Promise<void> {
        if (client.status === 'ready') return Promise.resolve()

        return new Promise((resolve, reject) => {
            client.once('ready', resolve)
            client.once('error', reject)
        })
    }

    /**
     * Registra handlers para eventos `connection` y `disconnect`.
     * Actualiza el mapa local, asigna la sala de usuario,
     * y registra handlers para gestión de salas desde el cliente.
     */
    private registerConnectionHandlers(): void {
        this.requireIO().on('connection', (socket) => {
            const userId = this.extractUserId(socket)
            if (!userId) {
                socket.disconnect(true)
                return
            }

            this.trackConnection(userId, socket.id)
            socket.join(`user_${userId}`)
            this.log.debug(`Socket conectado: ${socket.id} → user_${userId}`)

            // Handlers de salas (para playground y uso general)
            socket.on('room:join', (data: { roomName: string }) => {
                if (data?.roomName) {
                    socket.join(data.roomName)
                    this.log.debug(`Socket ${socket.id} unido a sala: ${data.roomName}`)
                }
            })

            socket.on('room:leave', (data: { roomName: string }) => {
                if (data?.roomName) {
                    socket.leave(data.roomName)
                    this.log.debug(`Socket ${socket.id} salió de sala: ${data.roomName}`)
                }
            })

            socket.on('room:emit', (data: { roomName: string; event: string; message: string }) => {
                if (data?.roomName && data?.event) {
                    this.requireIO().to(data.roomName).emit(data.event, {
                        message: data.message,
                        from: userId,
                        timestamp: new Date().toISOString(),
                    })
                    this.log.debug(`Emisión a sala "${data.roomName}": ${data.event}`)
                }
            })

            socket.on('disconnect', () => {
                this.untrackConnection(userId, socket.id)
                this.log.debug(`Socket desconectado: ${socket.id} → user_${userId}`)
            })
        })
    }

    /**
     * Extrae el userId del handshake del socket.
     * Se espera que el middleware de sesión lo inyecte en `socket.request.session`.
     *
     * @param socket - Socket recién conectado
     * @returns userId como string o `null` si no autenticado
     */
    private extractUserId(socket: any): string | null {
        const session = socket.request?.session
        const userId = session?.userId ?? session?.user_id
        return userId != null ? String(userId) : null
    }

    /**
     * Registra un socket en el mapa local de conexiones.
     *
     * @param userId - Identificador del usuario
     * @param socketId - ID del socket conectado
     */
    private trackConnection(userId: string, socketId: string): void {
        const sockets = this.localConnections.get(userId) ?? new Set<string>()
        sockets.add(socketId)
        this.localConnections.set(userId, sockets)
    }

    /**
     * Elimina un socket del mapa local. Si el usuario no tiene más sockets, limpia la entrada.
     *
     * @param userId - Identificador del usuario
     * @param socketId - ID del socket desconectado
     */
    private untrackConnection(userId: string, socketId: string): void {
        const sockets = this.localConnections.get(userId)
        if (!sockets) return

        sockets.delete(socketId)
        if (sockets.size === 0) {
            this.localConnections.delete(userId)
        }
    }

    /**
     * Obtiene la instancia de SocketServer o lanza error si no inicializado.
     */
    private requireIO(): SocketServer {
        if (!this.io) throw new Error('WebSocketService no inicializado. Llama a initialize() primero.')
        return this.io
    }

    /**
     * Cierra el servidor Socket.io.
     */
    private closeIO(): Promise<void> {
        if (!this.io) return Promise.resolve()

        return new Promise((resolve) => {
            this.io!.close(() => {
                this.io = null
                resolve()
            })
        })
    }

    /**
     * Cierra las conexiones Redis si existen.
     */
    private async closeRedisClients(): Promise<void> {
        const clients = [this.pubClient, this.subClient].filter(Boolean) as Redis[]
        await Promise.all(clients.map((c) => c.quit()))
        this.pubClient = null
        this.subClient = null
    }
}
