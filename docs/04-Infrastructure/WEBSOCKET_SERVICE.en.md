# WebSocket Service (`WebSocketService`)

The `WebSocketService` is a `socket.io` wrapper with a **Hybrid Configuration-Driven Architecture**. It supports an in-Memory adapter (development) and Redis Pub/Sub adapter (multi-node production).

## Operation Modes

Configured via `WS_ADAPTER` in `.env`.

### 1. `memory` Adapter (Development — Default)

Ideal for local development. Socket.io operates with its standard in-memory adapter.

```bash
# .env (or simply don't set it, memory is the default)
WS_ADAPTER=memory
```

### 2. `redis` Adapter (Production)

Uses Redis Pub/Sub to synchronize events across multiple server nodes.

```bash
# .env
WS_ADAPTER=redis
```

> Socket.io uses `ioredis` with `@socket.io/redis-adapter` to create `pubClient` and `subClient` with automatic error handling.

## Room-Based Routing Architecture

Routing **does not iterate over dictionaries**. It uses Socket.io's native Rooms:

1. On connection, each socket runs `join('user_{userId}')`.
2. Emitting to a user is always `io.to('user_{userId}').emit(...)`.
3. The adapter (Memory or Redis) automatically handles multi-node routing.

## Usage in Business Objects (Fire & Forget)

BOs resolve `IWebSocketService` from the IoC container and call methods **without `await`** (Fire & Forget):

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

            // Fire & Forget — DO NOT use await
            this.ws.emitToUser(String(data.userId), 'order:created', {
                orderId: order.id,
                status: order.status,
            })

            return this.created(order, 'Order created successfully')
        })
    }
}
```

> **Important**: Never use `await` when calling `emitToUser`, `broadcast`, or `emitToRoom`. These are Fire & Forget operations that should not block the HTTP response.

## Contract API (`IWebSocketService`)

| Method                                 | Description                                           |
| -------------------------------------- | ----------------------------------------------------- |
| `emitToUser(userId, event, payload)`   | Emit to all user connections via `user_{userId}` room |
| `broadcast(event, payload)`            | Emit to all connected clients                         |
| `emitToRoom(roomName, event, payload)` | Emit to all members of a room                         |
| `addUserToRoom(userId, roomName)`      | Add a user to a room                                  |
| `removeUserFromRoom(userId, roomName)` | Remove a user from a room                             |
| `getLocalConnectionsCount()`           | Returns active connections on this node               |
| `shutdown()`                           | Closes the WebSocket server                           |

## Authentication

The service consumes the `express-session` middleware during the Socket.io handshake:

- Connections **without an authenticated session** are automatically rejected.
- The `userId` is extracted from `socket.request.session.userId`.

## Local Tracking

The service maintains a `Map<string, Set<string>>` (`localConnections`) exclusively for physical node metrics. It is meticulously cleaned on the `disconnect` event to prevent memory leaks.
