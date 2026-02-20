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

## Room and Namespace Routing Architecture

Routing **does not iterate over dictionaries**. It uses Socket.io's native Rooms and Namespaces:

1. On connection, each socket runs `join('user_{userId}')` within its specific namespace.
2. Emitting to a user is always `io.of(namespace || '/').to('user_{userId}').emit(...)`.
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
            this.ws.emitToUser(
                String(data.userId),
                'order:created',
                {
                    orderId: order.id,
                    status: order.status,
                },
                '/orders'
            ) // Optional namespace parameter

            return this.created(order, 'Order created successfully')
        })
    }
}
```

> **Important**: Never use `await` when calling `emitToUser`, `broadcast`, or `emitToRoom`. These are Fire & Forget operations that should not block the HTTP response.

## Contract API (`IWebSocketService`)

| Method                                             | Description                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `emitToUser(userId, event, payload, namespace?)`   | Emit to all user connections via `user_{userId}` room in a namespace |
| `broadcast(event, payload, namespace?)`            | Emit to all connected clients in a namespace                         |
| `emitToRoom(roomName, event, payload, namespace?)` | Emit to all members of a room in a namespace                         |
| `addUserToRoom(userId, roomName, namespace?)`      | Add a user to a room within a namespace                              |
| `removeUserFromRoom(userId, roomName, namespace?)` | Remove a user from a room within a namespace                         |
| `getLocalConnectionsCount()`                       | Returns active connections on this node                              |
| `shutdown()`                                       | Closes the WebSocket server                                          |

## Authentication and Namespaces

The service consumes the `express-session` middleware during the Socket.io handshake:

- Connections **without an authenticated session** are automatically rejected via a lock (`requireAuth`).
- The `userId` is extracted from `socket.request.session.userId`.
- The lock is applied to the root namespace (`/`) natively, and dynamically injected into any secondary namespaces upon the `new_namespace` event.

## Local Tracking

The service maintains a `Map<string, Set<string>>` (`localConnections`) exclusively for physical node metrics. It is meticulously cleaned on the `disconnect` event to prevent memory leaks.
