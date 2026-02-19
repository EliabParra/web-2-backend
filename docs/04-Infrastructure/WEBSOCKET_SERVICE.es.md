# Servicio WebSocket (`WebSocketService`)

El `WebSocketService` es un wrapper sobre `socket.io` con **Arquitectura Híbrida Guiada por Configuración**. Soporta adaptador en Memoria Local (desarrollo) y Redis Pub/Sub (producción multi-nodo).

## Modos de Operación

Se configura en `.env` mediante `WS_ADAPTER`.

### 1. Adaptador `memory` (Desarrollo — Default)

Modo ideal para desarrollo local. Socket.io opera con su adaptador en memoria estándar.

```bash
# .env (o simplemente no configurar, memory es el default)
WS_ADAPTER=memory
```

### 2. Adaptador `redis` (Producción)

Usa Redis Pub/Sub para sincronizar eventos entre múltiples nodos del servidor.

```bash
# .env
WS_ADAPTER=redis
```

> Socket.io usará `ioredis` con `@socket.io/redis-adapter` para crear `pubClient` y `subClient` con manejo automático de errores.

## Arquitectura de Salas (Rooms)

El enrutamiento **no itera sobre diccionarios**. Usa las Salas nativas de Socket.io:

1. Al conectarse, cada socket hace `join('user_{userId}')`.
2. Emitir a un usuario es siempre `io.to('user_{userId}').emit(...)`.
3. El adaptador (Memory o Redis) delega automáticamente el ruteo multi-nodo.

## Uso en Business Objects (Fire & Forget)

Los BOs resuelven `IWebSocketService` desde el contenedor IoC y llaman los métodos **sin `await`** (Fire & Forget):

```typescript
import {
    BaseBO,
    ApiResponse,
    IContainer,
    IWebSocketService,
} from '../../src/core/business-objects/index.js'

export class OrderBO extends BaseBO {
    private ws: IWebSocketService

    constructor(container: IContainer) {
        super(container)
        this.ws = container.resolve<IWebSocketService>('websocket')
    }

    async create(params: CreateOrderInput): Promise<ApiResponse> {
        return this.exec(params, OrderSchemas.create, async (data) => {
            const order = await this.orderService.create(data)

            // Fire & Forget — NO usar await
            this.ws.emitToUser(String(data.userId), 'order:created', {
                orderId: order.id,
                status: order.status,
            })

            return this.created(order, 'Orden creada exitosamente')
        })
    }
}
```

> **Importante**: Nunca uses `await` al llamar `emitToUser`, `broadcast` o `emitToRoom`. Son operaciones Fire & Forget que no bloquean la respuesta HTTP.

## API del Contrato (`IWebSocketService`)

| Método                                 | Descripción                                                         |
| -------------------------------------- | ------------------------------------------------------------------- |
| `emitToUser(userId, event, payload)`   | Emite a todas las conexiones de un usuario vía sala `user_{userId}` |
| `broadcast(event, payload)`            | Emite a todos los clientes conectados                               |
| `emitToRoom(roomName, event, payload)` | Emite a todos los miembros de una sala                              |
| `addUserToRoom(userId, roomName)`      | Agrega un usuario a una sala                                        |
| `removeUserFromRoom(userId, roomName)` | Remueve un usuario de una sala                                      |
| `getLocalConnectionsCount()`           | Retorna conexiones activas del nodo                                 |
| `shutdown()`                           | Cierra el servidor WebSocket                                        |

## Autenticación

El servicio consume el middleware de `express-session` durante el handshake de Socket.io:

- Conexiones **sin sesión autenticada** son rechazadas automáticamente.
- El `userId` se extrae de `socket.request.session.userId`.

## Tracking Local

El servicio mantiene un `Map<string, Set<string>>` (`localConnections`) exclusivamente para métricas del nodo físico. Se limpia meticulosamente en el evento `disconnect` para evitar fugas de memoria.
