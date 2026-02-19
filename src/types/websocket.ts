/**
 * Contrato del Servicio WebSocket.
 *
 * Define la API pública para comunicación en tiempo real.
 * Soporta arquitectura híbrida: Memoria Local (desarrollo) y Redis Pub/Sub (producción).
 * El enrutamiento se delega a las Salas nativas de Socket.io.
 *
 * @module types/websocket
 */

/**
 * Interfaz del servicio WebSocket.
 *
 * Todos los métodos de emisión son Fire & Forget (no requieren `await`).
 * La gestión de Salas (Rooms) permite enrutar mensajes sin iterar diccionarios.
 */
export interface IWebSocketService {
    /**
     * Inicializa el servidor WebSocket sobre un servidor HTTP existente.
     * Configura el adaptador (Memory o Redis) según la configuración activa.
     *
     * @param httpServer - Instancia del servidor HTTP de Node.js
     */
    initialize(httpServer: any): Promise<void>

    /**
     * Emite un evento a todas las conexiones de un usuario específico.
     * Usa la sala `user_{userId}` para enrutamiento nativo.
     *
     * @param userId - Identificador único del usuario
     * @param event - Nombre del evento a emitir
     * @param payload - Datos del evento
     */
    emitToUser(userId: string, event: string, payload: any): void

    /**
     * Emite un evento a todos los clientes conectados (broadcast global).
     *
     * @param event - Nombre del evento a emitir
     * @param payload - Datos del evento
     */
    broadcast(event: string, payload: any): void

    /**
     * Emite un evento a todos los miembros de una sala específica.
     *
     * @param roomName - Nombre de la sala destino
     * @param event - Nombre del evento a emitir
     * @param payload - Datos del evento
     */
    emitToRoom(roomName: string, event: string, payload: any): void

    /**
     * Agrega todas las conexiones de un usuario a una sala.
     *
     * @param userId - Identificador del usuario
     * @param roomName - Nombre de la sala a unir
     */
    addUserToRoom(userId: string, roomName: string): void

    /**
     * Remueve todas las conexiones de un usuario de una sala.
     *
     * @param userId - Identificador del usuario
     * @param roomName - Nombre de la sala a abandonar
     */
    removeUserFromRoom(userId: string, roomName: string): void

    /**
     * Retorna el conteo de conexiones activas rastreadas localmente en este nodo.
     *
     * @returns Número de usuarios con al menos una conexión activa
     */
    getLocalConnectionsCount(): number

    /**
     * Cierra el servidor WebSocket y libera recursos.
     * Desconecta clientes y cierra conexiones Redis si aplica.
     */
    shutdown(): Promise<void>
}
