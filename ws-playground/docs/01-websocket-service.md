# WebSocketService — Guía Detallada Línea por Línea

> **Archivo:** `src/services/WebSocketService.ts`
> **Responsabilidad:** Gestionar conexiones WebSocket en tiempo real, emitir eventos a usuarios/salas, y escalar horizontalmente via Redis Pub/Sub.

---

## Tabla de Contenidos

1. [Imports y Dependencias](#1-imports-y-dependencias)
2. [Arquitectura Híbrida](#2-arquitectura-híbrida)
3. [Propiedades de la Clase](#3-propiedades-de-la-clase)
4. [Constructor](#4-constructor)
5. [initialize() — Punto de Entrada](#5-initialize--punto-de-entrada)
6. [Métodos Públicos de Emisión](#6-métodos-públicos-de-emisión)
7. [Gestión de Salas (Rooms)](#7-gestión-de-salas-rooms)
8. [Métricas y Shutdown](#8-métricas-y-shutdown)
9. [Middleware de Sesión](#9-middleware-de-sesión)
10. [Handlers de Conexión](#10-handlers-de-conexión)
11. [Tracking de Conexiones Locales](#11-tracking-de-conexiones-locales)
12. [Adaptador Redis](#12-adaptador-redis)
13. [Cleanup y Cierre](#13-cleanup-y-cierre)
14. [Diagrama de Flujo Completo](#14-diagrama-de-flujo-completo)

---

## 1. Imports y Dependencias

```typescript
import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import type { IWebSocketService, IContainer, ILogger, IConfig } from '../types/index.js'
import type { Express } from 'express'
```

| Import                   | Para qué sirve                                                                   |
| ------------------------ | -------------------------------------------------------------------------------- |
| `Server as SocketServer` | Clase principal de Socket.io. Se renombra para evitar colisión con `http.Server` |
| `createAdapter`          | Función de `@socket.io/redis-adapter` que conecta Socket.io a Redis Pub/Sub      |
| `Redis`                  | Cliente Redis de `ioredis` para crear los canales pub/sub                        |
| `IWebSocketService`      | Interfaz que define el contrato público del servicio                             |
| `IContainer`             | Contenedor IoC para resolver dependencias                                        |
| `Express`                | Tipo de Express, usado para extraer el middleware de sesión                      |

> **¿Por qué se importa `Express`?** Porque necesitamos acceder al `_router.stack` de la app Express para encontrar el middleware de `express-session` y compartirlo con Socket.io.

---

## 2. Arquitectura Híbrida

```typescript
/**
 * Servicio WebSocket con Arquitectura Híbrida.
 *
 * Soporta dos modos de transporte configurables:
 * - **memory**: Adaptador en memoria para desarrollo local (single-node).
 * - **redis**: Adaptador Redis Pub/Sub para alta disponibilidad multi-nodo.
 */
```

La "arquitectura híbrida" se refiere a que **el mismo código** funciona en dos escenarios:

| Modo     | Cuándo                             | Qué hace                                                                                              |
| -------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `memory` | Desarrollo local, un solo servidor | Socket.io usa su adaptador por defecto (en memoria). Todas las conexiones están en el mismo proceso   |
| `redis`  | Producción, múltiples servidores   | Socket.io usa Redis Pub/Sub. Cuando un nodo emite un evento, Redis lo propaga a todos los demás nodos |

**La clave:** El código de negocio (BOs) no sabe ni le importa qué adaptador está activo. Simplemente llama `ws.emitToUser()` y funciona.

---

## 3. Propiedades de la Clase

```typescript
export class WebSocketService implements IWebSocketService {
    private readonly log: ILogger
    private readonly config: IConfig
    private readonly container: IContainer

    private io: SocketServer | null = null
    private pubClient: Redis | null = null
    private subClient: Redis | null = null

    private readonly localConnections = new Map<string, Set<string>>()
```

### Desglose:

| Propiedad          | Tipo                       | Propósito                                                                        |
| ------------------ | -------------------------- | -------------------------------------------------------------------------------- |
| `log`              | `ILogger`                  | Logger con categoría `WebSocket` (creado via `.child()`)                         |
| `config`           | `IConfig`                  | Configuración de la app (lee `config.websocket.adapter` y `config.cors.origins`) |
| `container`        | `IContainer`               | Contenedor IoC para resolver `expressApp` cuando se necesite                     |
| `io`               | `SocketServer \| null`     | Instancia del servidor Socket.io. `null` antes de `initialize()`                 |
| `pubClient`        | `Redis \| null`            | Cliente Redis para **publicar** mensajes (solo en modo redis)                    |
| `subClient`        | `Redis \| null`            | Cliente Redis para **suscribirse** a mensajes (solo en modo redis)               |
| `localConnections` | `Map<string, Set<string>>` | Mapa de `userId → Set<socketId>` para tracking local                             |

### ¿Por qué `localConnections` es un `Map<string, Set<string>>`?

Porque un mismo usuario puede tener **múltiples conexiones** (varias pestañas del navegador, app móvil + web). El `Set` evita duplicados de `socketId`.

```
localConnections = {
  "42" → Set { "abc123", "def456" },   // usuario 42 con 2 pestañas
  "7"  → Set { "ghi789" },             // usuario 7 con 1 conexión
}
```

> **Importante:** Este mapa es **exclusivo para métricas del nodo**. NO se usa para enrutamiento de mensajes. El enrutamiento lo manejan las **Salas de Socket.io** (`user_42`), que funcionan automáticamente entre nodos con Redis.

---

## 4. Constructor

```typescript
constructor(container: IContainer) {
    this.container = container
    this.config = container.resolve<IConfig>('config')
    this.log = container.resolve<ILogger>('log').child({ category: 'WebSocket' })
}
```

**Línea por línea:**

1. **`this.container = container`** — Guarda el contenedor para usarlo después en `applySessionMiddleware()`.
2. **`container.resolve<IConfig>('config')`** — Obtiene la configuración global.
3. **`.child({ category: 'WebSocket' })`** — Crea un sub-logger que siempre incluye `category: "WebSocket"` en cada log. Esto permite filtrar logs del servicio WebSocket en producción.

> **Nota:** El constructor NO inicializa Socket.io. Eso se hace en `initialize()`, que requiere el `httpServer` que aún no existe cuando se construye el servicio.

---

## 5. initialize() — Punto de Entrada

```typescript
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
```

### Flujo paso a paso:

1. **Lee los orígenes CORS** de la configuración (`config.cors.origins`), con fallback a `['*']`.
2. **Crea el servidor Socket.io** acoplado al `httpServer` de Express.
    - `credentials: true` permite enviar cookies (necesario para sesiones).
3. **Configura el adaptador** — Si es Redis, establece conexión Pub/Sub.
4. **Inyecta el middleware de sesión** — Para que Socket.io pueda leer la sesión de Express.
5. **Registra los handlers** de `connection`/`disconnect`.
6. **Log informativo** con el adaptador activo.

> **¿Por qué `async`?** Porque `configureAdapter()` necesita esperar la conexión a Redis (si aplica). Si es `memory`, la promesa se resuelve inmediatamente.

---

## 6. Métodos Públicos de Emisión

Estos son los métodos que los BOs y controladores usan. Siguen el patrón **Fire & Forget**: se llaman SIN `await`.

### emitToUser()

```typescript
emitToUser(userId: string, event: string, payload: any): void {
    this.requireIO().to(`user_${userId}`).emit(event, payload)
}
```

- **`requireIO()`** — Guard que lanza error si `initialize()` no se llamó.
- **`.to('user_42')`** — Selecciona la **sala** del usuario (cada socket hace `join('user_42')` al conectarse).
- **`.emit(event, payload)`** — Envía el evento a **todos los sockets** en esa sala.

**Con Redis:** Si el usuario está conectado en otro nodo, Redis Pub/Sub propaga el mensaje automáticamente.

### broadcast()

```typescript
broadcast(event: string, payload: any): void {
    this.requireIO().emit(event, payload)
}
```

- **`io.emit()`** sin `.to()` = envía a **TODOS** los clientes conectados en **todos los nodos**.

### emitToRoom()

```typescript
emitToRoom(roomName: string, event: string, payload: any): void {
    this.requireIO().to(roomName).emit(event, payload)
}
```

- Igual que `emitToUser`, pero con un nombre de sala arbitrario (ej: `"dashboard"`, `"ventas"`).

---

## 7. Gestión de Salas (Rooms)

### addUserToRoom()

```typescript
addUserToRoom(userId: string, roomName: string): void {
    const sockets = this.localConnections.get(userId)
    if (!sockets) return

    for (const socketId of sockets) {
        const socket = this.requireIO().sockets.sockets.get(socketId)
        socket?.join(roomName)
    }
}
```

**Línea por línea:**

1. **Busca los sockets** del usuario en el mapa local.
2. **Si no tiene conexiones**, no hace nada (no hay error, es un no-op seguro).
3. **Itera sobre todos sus sockets** y los hace `join` a la sala.
4. **`socket?.join()`** — El `?.` protege contra race conditions donde el socket se desconecta entre la lectura del mapa y el `join`.

### removeUserFromRoom()

```typescript
removeUserFromRoom(userId: string, roomName: string): void {
    const sockets = this.localConnections.get(userId)
    if (!sockets) return

    for (const socketId of sockets) {
        const socket = this.requireIO().sockets.sockets.get(socketId)
        socket?.leave(roomName)
    }
}
```

Idéntico al anterior pero con `leave()` en vez de `join()`.

> **¿Por qué iterar todos los sockets?** Si un usuario tiene 3 pestañas abiertas, las 3 deben unirse/salir de la sala.

---

## 8. Métricas y Shutdown

### getLocalConnectionsCount()

```typescript
getLocalConnectionsCount(): number {
    return this.localConnections.size
}
```

Retorna cuántos **usuarios únicos** tienen al menos una conexión en **este nodo**. No es el total de sockets, es el total de **usuarios**.

### shutdown()

```typescript
async shutdown(): Promise<void> {
    await this.closeIO()
    await this.closeRedisClients()
    this.localConnections.clear()
    this.log.info('WebSocket cerrado correctamente')
}
```

**Orden de cierre (importante):**

1. **Cierra Socket.io** — Desconecta todos los clientes activos.
2. **Cierra Redis** — Libera las conexiones pub/sub.
3. **Limpia el mapa** — Libera la memoria del tracking local.

> **Es seguro llamar múltiples veces** — `closeIO()` y `closeRedisClients()` verifican `null` antes de actuar.

---

## 9. Middleware de Sesión

### applySessionMiddleware()

```typescript
private applySessionMiddleware(): void {
    const app = this.container.resolve<Express>('expressApp')
    const sessionMiddleware = this.findSessionMiddleware(app)

    if (!sessionMiddleware) {
        this.log.warn('No se encontró middleware de sesión en Express...')
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
```

**Este es uno de los métodos más importantes. Hace dos cosas:**

#### Paso 1: Reusar express-session

```typescript
this.requireIO().engine.use(sessionMiddleware)
```

- **`engine.use()`** inyecta un middleware en el **Engine.IO** (la capa de transporte de Socket.io).
- Esto hace que cada **handshake** pase por `express-session`, que lee la cookie de sesión y popula `req.session`.
- **Resultado:** `socket.request.session` ya tiene los datos de la sesión del usuario.

> **¿Por qué `engine.use()` y no `io.use()`?** Porque `engine.use()` corre ANTES del handshake de Socket.io. Si lo ponemos en `io.use()`, el middleware de sesión ya no puede leer las cookies del upgrade HTTP.

#### Paso 2: Validar autenticación

```typescript
this.requireIO().use((socket, next) => {
    const session = (socket.request as any)?.session
    const userId = session?.userId ?? session?.user_id
    if (!userId) {
        next(new Error('...'))
        return
    }
    next()
})
```

- **`io.use()`** es un middleware de Socket.io que corre en cada **conexión**.
- Lee `session.userId` o `session.user_id` (soporta ambas convenciones).
- Si no hay userId → **rechaza la conexión** con un error que el cliente recibe como `connect_error`.
- Si hay userId → **permite la conexión** con `next()`.

### findSessionMiddleware()

```typescript
private findSessionMiddleware(app: Express): any {
    const stack: any[] = (app as any)._router?.stack ?? []
    const sessionLayer = stack.find(
        (layer: any) => layer.name === 'session' && typeof layer.handle === 'function'
    )
    return sessionLayer?.handle ?? null
}
```

**¿Cómo encuentra el middleware de sesión?**

Express mantiene internamente un array `_router.stack` con todos los middleware registrados. Cada entrada tiene:

- `name` — Nombre de la función middleware
- `handle` — La función en sí

`express-session` registra una función llamada `'session'`. Este método la busca por nombre y retorna la función para que Socket.io la pueda reusar.

> **Es una técnica avanzada** — No está documentada oficialmente en Express, pero es la forma estándar de compartir el middleware de sesión con Socket.io.

---

## 10. Handlers de Conexión

### registerConnectionHandlers()

```typescript
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
```

**Cuando un cliente se conecta:**

1. **Extrae el userId** de la sesión del socket.
2. **Si no hay userId** (no pasó el middleware), lo desconecta.
3. **Registra en el mapa local** — `trackConnection(userId, socketId)`.
4. **Une al socket a la sala del usuario** — `user_42`. Esto es fundamental para que `emitToUser()` funcione.

### Handlers de salas del cliente

```typescript
socket.on('room:join', (data: { roomName: string }) => {
    if (data?.roomName) {
        socket.join(data.roomName)
    }
})

socket.on('room:leave', (data: { roomName: string }) => {
    if (data?.roomName) {
        socket.leave(data.roomName)
    }
})

socket.on('room:emit', (data: { roomName: string; event: string; message: string }) => {
    if (data?.roomName && data?.event) {
        this.requireIO().to(data.roomName).emit(data.event, {
            message: data.message,
            from: userId,
            timestamp: new Date().toISOString(),
        })
    }
})
```

Estos handlers permiten que **el cliente** gestione salas directamente via WebSocket (sin pasar por REST):

| Evento       | Acción                                                     |
| ------------ | ---------------------------------------------------------- |
| `room:join`  | El socket se une a una sala                                |
| `room:leave` | El socket sale de una sala                                 |
| `room:emit`  | El socket emite un evento a todos los miembros de una sala |

> **Validación:** Cada handler verifica `data?.roomName` antes de actuar. Si el payload es inválido, simplemente no hace nada.

### Handler de desconexión

```typescript
socket.on('disconnect', () => {
    this.untrackConnection(userId, socket.id)
    this.log.debug(`Socket desconectado: ${socket.id} → user_${userId}`)
})
```

Cuando un socket se desconecta, lo **elimina del mapa local**. Si era el último socket del usuario, elimina toda la entrada.

### extractUserId()

```typescript
private extractUserId(socket: any): string | null {
    const session = socket.request?.session
    const userId = session?.userId ?? session?.user_id
    return userId != null ? String(userId) : null
}
```

- Lee la sesión del request del socket (inyectada por el middleware).
- Soporta ambas convenciones: `userId` y `user_id`.
- Siempre retorna **string** (normaliza números a string con `String(userId)`).

---

## 11. Tracking de Conexiones Locales

### trackConnection()

```typescript
private trackConnection(userId: string, socketId: string): void {
    const sockets = this.localConnections.get(userId) ?? new Set<string>()
    sockets.add(socketId)
    this.localConnections.set(userId, sockets)
}
```

1. Obtiene el `Set` existente o crea uno nuevo.
2. Agrega el `socketId`.
3. Guarda el `Set` en el mapa.

### untrackConnection()

```typescript
private untrackConnection(userId: string, socketId: string): void {
    const sockets = this.localConnections.get(userId)
    if (!sockets) return

    sockets.delete(socketId)
    if (sockets.size === 0) {
        this.localConnections.delete(userId)
    }
}
```

1. Si el usuario no tiene sockets registrados, retorna (no-op).
2. Elimina el `socketId` del `Set`.
3. **Si el `Set` queda vacío**, elimina la entrada completa del `Map`. Esto evita memory leaks.

---

## 12. Adaptador Redis

### configureAdapter()

```typescript
private async configureAdapter(): Promise<void> {
    if (this.config.websocket.adapter !== 'redis') return

    this.pubClient = new Redis()
    this.subClient = this.pubClient.duplicate()

    this.pubClient.on('error', (err) => this.log.error('Redis pubClient error', err))
    this.subClient.on('error', (err) => this.log.error('Redis subClient error', err))

    await Promise.all([
        this.waitForConnection(this.pubClient),
        this.waitForConnection(this.subClient)
    ])

    this.requireIO().adapter(createAdapter(this.pubClient, this.subClient))
    this.log.info('Adaptador Redis Pub/Sub configurado')
}
```

**¿Por qué DOS clientes Redis?**

Redis Pub/Sub tiene una limitación: un cliente que está en modo **subscribe** no puede usar comandos regulares. Por eso Socket.io necesita:

- **pubClient** — Para publicar mensajes (PUBLISH)
- **subClient** — Para suscribirse a canales (SUBSCRIBE)

**`pubClient.duplicate()`** crea un segundo cliente con la misma configuración de conexión.

### waitForConnection()

```typescript
private waitForConnection(client: Redis): Promise<void> {
    if (client.status === 'ready') return Promise.resolve()

    return new Promise((resolve, reject) => {
        client.once('ready', resolve)
        client.once('error', reject)
    })
}
```

Patrón de promisificación de eventos. Espera a que Redis esté listo o falle.

---

## 13. Cleanup y Cierre

### requireIO()

```typescript
private requireIO(): SocketServer {
    if (!this.io) throw new Error('WebSocketService no inicializado...')
    return this.io
}
```

**Guard pattern.** Se usa en todos los métodos que necesitan `io`. Si no se llamó `initialize()`, lanza un error descriptivo en vez de un críptico `Cannot read property of null`.

### closeIO()

```typescript
private closeIO(): Promise<void> {
    if (!this.io) return Promise.resolve()

    return new Promise((resolve) => {
        this.io!.close(() => {
            this.io = null
            resolve()
        })
    })
}
```

`io.close()` es callback-based. Este método lo envuelve en una Promise para usar con `await`.

### closeRedisClients()

```typescript
private async closeRedisClients(): Promise<void> {
    const clients = [this.pubClient, this.subClient].filter(Boolean) as Redis[]
    await Promise.all(clients.map((c) => c.quit()))
    this.pubClient = null
    this.subClient = null
}
```

1. **`.filter(Boolean)`** — Descarta los `null` (si no estamos en modo Redis).
2. **`Promise.all`** — Cierra ambos clientes en paralelo.
3. **`quit()`** — Cierre gracioso de Redis (espera a que terminen los comandos pendientes).

---

## 14. Diagrama de Flujo Completo

```mermaid
sequenceDiagram
    participant Cliente
    participant Socket.io
    participant SessionMW as express-session
    participant WS as WebSocketService
    participant Redis

    Note over Cliente,Redis: Fase 1: Conexión
    Cliente->>Socket.io: Handshake (con cookie de sesión)
    Socket.io->>SessionMW: engine.use(sessionMiddleware)
    SessionMW-->>Socket.io: req.session.userId = 42
    Socket.io->>WS: io.use() → ¿tiene userId?
    WS-->>Socket.io: ✅ next()
    Socket.io->>WS: connection event
    WS->>WS: trackConnection("42", "abc123")
    WS->>Socket.io: socket.join("user_42")

    Note over Cliente,Redis: Fase 2: Emisión
    Note right of WS: Un BO llama ws.emitToUser("42", "evento", data)
    WS->>Socket.io: io.to("user_42").emit("evento", data)
    Socket.io->>Redis: PUBLISH (si modo redis)
    Redis-->>Socket.io: Propaga a otros nodos
    Socket.io->>Cliente: "evento" + data

    Note over Cliente,Redis: Fase 3: Desconexión
    Cliente->>Socket.io: disconnect
    Socket.io->>WS: disconnect event
    WS->>WS: untrackConnection("42", "abc123")
```
