# Playground Frontend — Guía Detallada

> **Directorio:** `ws-playground/`
> **Responsabilidad:** Aplicación frontend standalone que demuestra y prueba todas las funcionalidades del servicio WebSocket en tiempo real.

---

## Tabla de Contenidos

1. [Arquitectura del Playground](#1-arquitectura-del-playground)
2. [Servidor Estático — serve.js](#2-servidor-estático--servejs)
3. [HTML — Estructura y Secciones](#3-html--estructura-y-secciones)
4. [CSS — Sistema de Diseño](#4-css--sistema-de-diseño)
5. [App.js — Lógica Completa](#5-appjs--lógica-completa)
6. [Flujo de Autenticación (CSRF + Login)](#6-flujo-de-autenticación-csrf--login)
7. [Conexión WebSocket](#7-conexión-websocket)
8. [Emisión via API REST → BO → WebSocket](#8-emisión-via-api-rest--bo--websocket)
9. [Simulación de Progreso (Status Bar)](#9-simulación-de-progreso-status-bar)
10. [Gestión de Salas (Rooms)](#10-gestión-de-salas-rooms)
11. [Event Log en Tiempo Real](#11-event-log-en-tiempo-real)
12. [¿Por qué CORS y Puerto Separado?](#12-por-qué-cors-y-puerto-separado)
13. [Cómo Ejecutar](#13-cómo-ejecutar)

---

## 1. Arquitectura del Playground

```
ws-playground/
├── serve.js          ← Servidor estático Node.js (puerto 5173)
├── index.html        ← UI principal
├── styles.css        ← Dark theme con glassmorphism
├── app.js            ← Lógica socket.io-client + API REST
└── docs/             ← Esta documentación
```

### ¿Por qué un frontend separado?

1. **Prueba de CORS** — El playground corre en puerto 5173, el backend en 3000. Esto simula un escenario real donde frontend y backend están en dominios/puertos diferentes.
2. **Aislamiento** — No contamina el backend con archivos estáticos de prueba.
3. **Zero dependencias** — HTML/CSS/JS vanilla, sin bundler ni framework.

### Diagrama de comunicación:

```
┌──────────────────────┐         ┌──────────────────────┐
│  ws-playground:5173  │         │   Backend:3000       │
│                      │         │                      │
│  index.html          │◄───────►│  GET /csrf           │
│  app.js              │ HTTP    │  POST /login         │
│  styles.css          │ REST    │  POST /toProccess    │
│                      │         │  POST /logout        │
│  socket.io-client    │◄═══════►│  WebSocketService    │
│                      │ WS      │  (Socket.io Server)  │
└──────────────────────┘         └──────────────────────┘
```

> **Nota:** El playground usa **dos canales** de comunicación: HTTP REST (para las API del BO) y WebSocket (para recibir eventos en tiempo real).

---

## 2. Servidor Estático — serve.js

```javascript
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = 5173
const __dirname = path.dirname(fileURLToPath(import.meta.url))
```

### ¿Por qué Node.js puro y no Express?

Porque solo necesitamos servir 3 archivos estáticos. Un `http.createServer` con un mapa de MIME types es suficiente.

### Tabla de MIME types:

```javascript
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
}
```

### Handler de requests:

```javascript
const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url)
    const ext = path.extname(filePath)
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404)
            res.end('Not found')
            return
        }
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(data)
    })
})
```

**Línea por línea:**

1. Si la URL es `/`, sirve `index.html`.
2. Determina el Content-Type por la extensión del archivo.
3. Lee el archivo del disco y lo envía. Si no existe, retorna 404.

---

## 3. HTML — Estructura y Secciones

El `index.html` tiene 7 secciones principales, cada una en una **card** con glassmorphism:

| #   | Sección             | Ubicación          | Propósito                 |
| --- | ------------------- | ------------------ | ------------------------- |
| 1   | 🔐 Autenticación    | `card full-width`  | Login/logout con CSRF     |
| 2   | 📊 Métricas         | `card full-width`  | Contadores en tiempo real |
| 3   | 👤 Emitir a Usuario | `card` (izquierda) | Probar `emitToUser()`     |
| 4   | 📢 Broadcast        | `card` (derecha)   | Probar `broadcast()`      |
| 5   | ⏳ Status Bar       | `card full-width`  | Barra de progreso animada |
| 6   | 🏠 Salas            | `card` (izquierda) | Join/leave/emit a rooms   |
| 7   | 🔌 Conexión         | `card` (derecha)   | Connect/disconnect manual |
| 8   | 📜 Event Log        | `card full-width`  | Log en tiempo real        |

### Header con doble badge:

```html
<header>
    <h1><span>⚡</span> WebSocket Playground</h1>
    <div style="display: flex; align-items: center; gap: 12px;">
        <div id="auth-badge" class="status-badge disconnected">
            <div class="dot"></div>
            <span id="auth-text">Sin sesión</span>
        </div>
        <div id="status-badge" class="status-badge disconnected">
            <div class="dot"></div>
            <span id="status-text">Desconectado</span>
        </div>
    </div>
</header>
```

**Dos badges independientes:**

- **Auth badge** — Estado de la sesión HTTP (login/logout).
- **Status badge** — Estado de la conexión WebSocket.

Cada badge tiene tres estados CSS: `connected` (verde), `disconnected` (rojo), `connecting` (amarillo con pulso).

### Socket.io Client CDN:

```html
<script src="https://cdn.socket.io/4.8.3/socket.io.min.js"></script>
<script src="app.js"></script>
```

Se carga `socket.io-client` desde CDN. Esto expone la función global `io()` que `app.js` usa para crear conexiones.

---

## 4. CSS — Sistema de Diseño

### Variables CSS (Design Tokens):

```css
:root {
    --bg-primary: #0a0a0f; /* Fondo más oscuro */
    --bg-secondary: #12121a; /* Cards internas */
    --bg-card: rgba(22, 22, 35, 0.85); /* Cards con transparencia */
    --border: rgba(255, 255, 255, 0.06);
    --accent: #7c3aed; /* Violeta principal */
    --accent-light: #a78bfa; /* Violeta claro */
    --success: #22c55e; /* Verde */
    --error: #ef4444; /* Rojo */
    --warning: #f59e0b; /* Amarillo */
    --info: #3b82f6; /* Azul */
}
```

### Glassmorphism:

```css
.card {
    background: var(--bg-card); /* Fondo semi-transparente */
    backdrop-filter: saturate(1.8) blur(20px); /* Efecto glass */
    border: 1px solid var(--border); /* Borde sutil */
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
```

El efecto glassmorphism se logra con:

1. **Background semi-transparente** (`rgba` con alpha 0.85).
2. **`backdrop-filter: blur()`** — Difumina lo que está detrás.
3. **`saturate(1.8)`** — Aumenta la saturación del blur.

### Animación de fondo:

```css
body::before {
    content: '';
    position: fixed;
    background: radial-gradient(circle at 30% 20%, rgba(124, 58, 237, 0.08)...);
    animation: bgShift 20s ease-in-out infinite alternate;
}
```

Un pseudo-elemento con gradientes radiales que se mueve lentamente, creando un efecto de aurora sutil detrás de todo.

### Tipografía:

| Fuente           | Uso                                 |
| ---------------- | ----------------------------------- |
| `Inter`          | UI general (labels, botones, texto) |
| `JetBrains Mono` | Código, métricas, log de eventos    |

---

## 5. App.js — Lógica Completa

### Patrón IIFE (Immediately Invoked Function Expression):

```javascript
const app = (() => {
    // Estado privado
    let socket = null
    let eventCount = 0
    let sentCount = 0
    let csrfToken = null
    const rooms = new Set()

    // ... funciones privadas ...

    return {
        login,
        logout,
        connect,
        disconnect,
        sendToUser,
        sendBroadcast,
        startSimulation,
        joinRoom,
        leaveRoom,
        emitToRoom,
        removeRoom,
        clearLog,
    }
})()
```

**¿Por qué IIFE?**

1. **Encapsulación** — Las variables internas (`socket`, `csrfToken`, etc.) son inaccesibles desde fuera.
2. **API pública limpia** — Solo se exponen las funciones que el HTML necesita.
3. **Sin globals contaminantes** — Solo `app` es global.

### Estado interno:

| Variable     | Tipo             | Propósito                            |
| ------------ | ---------------- | ------------------------------------ |
| `socket`     | `Socket \| null` | Instancia de la conexión Socket.io   |
| `eventCount` | `number`         | Contador de eventos recibidos        |
| `sentCount`  | `number`         | Contador de eventos enviados         |
| `csrfToken`  | `string \| null` | Token CSRF obtenido de `GET /csrf`   |
| `rooms`      | `Set<string>`    | Salas a las que el socket está unido |

---

## 6. Flujo de Autenticación (CSRF + Login)

### Paso 1: Obtener token CSRF

```javascript
async function fetchCsrfToken() {
    const url = getBackendUrl()
    const res = await fetch(`${url}/csrf`, {
        credentials: 'include', // ← Envía y recibe cookies
    })
    const json = await res.json()
    csrfToken = json.csrfToken // ← Guarda para usar en login
    return csrfToken
}
```

**`credentials: 'include'`** es crucial. Sin esto, el navegador no enviaría ni recibiría la cookie de sesión (`connect.sid`) en requests cross-origin.

### Paso 2: Login

```javascript
async function login() {
    // 1. Obtener CSRF
    const token = await fetchCsrfToken()

    // 2. POST /login con CSRF header
    const res = await fetch(`${url}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token, // ← Header CSRF requerido
        },
        credentials: 'include', // ← Envía la cookie de sesión
        body: JSON.stringify({ identifier, password }),
    })

    if (res.ok) {
        // 3. Auto-conectar WebSocket
        connect()
    }
}
```

### ¿Qué pasa "bajo la mesa"?

1. `GET /csrf` → El backend crea una sesión y pone un token CSRF en ella. El navegador recibe la cookie `connect.sid`.
2. `POST /login` → El navegador envía automáticamente la cookie `connect.sid`. El backend verifica que el `X-CSRF-Token` coincida con el de la sesión.
3. Si el login es exitoso, la sesión ahora tiene `userId`.
4. `connect()` → Socket.io conecta y envía la misma cookie. El WebSocket lee la sesión y ve el `userId`.

### Paso 3: Logout

```javascript
async function logout() {
    // Primero desconecta WebSocket
    if (socket?.connected) disconnect()

    // Luego destruye la sesión
    await fetch(`${url}/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({}),
    })

    csrfToken = null
}
```

**Orden: WebSocket primero, luego sesión.** Si destruimos la sesión antes, el WebSocket perdería la autenticación abruptamente.

---

## 7. Conexión WebSocket

```javascript
function connect() {
    socket = io(url, {
        transports: ['websocket'],     // Solo WebSocket (sin polling)
        withCredentials: true,          // Envía cookies de sesión
        reconnection: true,             // Auto-reconexión
        reconnectionAttempts: 5,        // Máximo 5 intentos
        reconnectionDelay: 2000,        // 2 segundos entre intentos
    })
```

### Opciones explicadas:

| Opción                      | Valor          | Por qué                                           |
| --------------------------- | -------------- | ------------------------------------------------- |
| `transports: ['websocket']` | Solo WS        | Evita el fallback a HTTP long-polling (más lento) |
| `withCredentials: true`     | Envía cookies  | Necesario para que el backend lea la sesión       |
| `reconnection: true`        | Auto-reconecta | Si se pierde la conexión, intenta reconectar      |
| `reconnectionAttempts: 5`   | 5 intentos     | No intenta infinitamente                          |
| `reconnectionDelay: 2000`   | 2 segundos     | Espera entre intentos                             |

### Listeners registrados:

```javascript
socket.on('connect', () => { ... })         // Conexión exitosa
socket.on('disconnect', (reason) => { ... }) // Desconexión
socket.on('connect_error', (err) => { ... }) // Error al conectar

// Listener específico para la barra de progreso
socket.on('progress:update', (data) => {
    updateProgressBar(data)
})

// Listener universal — captura TODOS los eventos
socket.onAny((eventName, ...args) => {
    eventCount++
    logEvent('event', eventName, args[0])
})
```

### ¿Por qué `on('progress:update')` Y `onAny()`?

- **`on('progress:update')`** — Handler específico que actualiza la barra de progreso.
- **`onAny()`** — Handler universal que loguea TODOS los eventos en el log.

Ambos se ejecutan para `progress:update`. `onAny` no interfiere con handlers específicos.

---

## 8. Emisión via API REST → BO → WebSocket

### sendToUser()

```javascript
async function sendToUser() {
    const res = await fetch(`${url}/toProccess`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
            tx: 'Notification.send', // ← BO.método
            data: { userId, event, message }, // ← Parámetros
        }),
    })
}
```

### Flujo completo:

```
Frontend                Backend
   │                       │
   ├── POST /toProccess ──►│
   │   tx: "Notification.send"
   │   data: { userId, event, message }
   │                       │
   │                       ├── TxController.handle()
   │                       ├── Resuelve "Notification" → NotificationBO
   │                       ├── Llama NotificationBO.send()
   │                       ├── Valida con Zod ✅
   │                       ├── ws.emitToUser(userId, event, payload)
   │                       │     └── io.to("user_42").emit(...)
   │                       │
   │◄── HTTP 200 ──────────┤
   │                       │
   │◄══ WS: event ════════╡ (llega via WebSocket, no HTTP)
   │                       │
```

> **El CSRF token se envía como `X-CSRF-Token`** usando un spread condicional: `...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})`. Si no hay token, simplemente no agrega el header.

---

## 9. Simulación de Progreso (Status Bar)

### startSimulation()

```javascript
async function startSimulation() {
    const userId = document.getElementById('sim-user-id').value.trim()
    const steps = parseInt(document.getElementById('sim-steps').value) || 8
    const delayMs = parseInt(document.getElementById('sim-delay').value) || 600

    resetProgressBar()

    await fetch(`${url}/toProccess`, {
        body: JSON.stringify({
            tx: 'Notification.simulate',
            data: { userId, steps, delayMs },
        }),
    })
}
```

### updateProgressBar() — Actualización en tiempo real

```javascript
function updateProgressBar(data) {
    const bar = document.getElementById('progress-bar')
    const label = document.getElementById('progress-label')
    const percent = document.getElementById('progress-percent')
    const stepInfo = document.getElementById('progress-step')

    bar.style.width = `${data.percent}%` // Anima la barra
    label.textContent = data.label // "Cargando dependencias…"
    percent.textContent = `${data.percent}%` // "38%"
    stepInfo.textContent = `Paso ${data.step}/${data.totalSteps} — taskId: ${data.taskId}`

    if (data.status === 'completed') {
        bar.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)' // Verde
        label.textContent = '✅ ' + data.label
    }
}
```

### ¿Cómo se ve la animación?

La barra usa `transition: width 0.3s ease` en CSS, lo que hace que cada incremento de porcentaje se anime suavemente en 300ms. Con un delay de 600ms entre chunks, la barra se llena de forma fluida.

```css
#progress-bar {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--info));
    border-radius: 999px;
    transition: width 0.3s ease; /* ← Esto anima el cambio de width */
}
```

### resetProgressBar()

```javascript
function resetProgressBar() {
    bar.style.width = '0%'
    bar.style.background = 'linear-gradient(90deg, var(--accent), var(--info))' // Reset a violeta
    label.textContent = 'Iniciando…'
    percent.textContent = '0%'
    stepInfo.textContent = '—'
}
```

Se llama antes de cada nueva simulación para limpiar el estado anterior.

---

## 10. Gestión de Salas (Rooms)

### joinRoom() — Comunicación directa via Socket.io

```javascript
function joinRoom() {
    const roomName = document.getElementById('room-name').value.trim()
    if (!roomName) return
    if (!socket?.connected) {
        logEvent('error', 'Primero debes conectarte al servidor')
        return
    }

    socket.emit('room:join', { roomName }) // ← Evento directo al servidor
    rooms.add(roomName) // ← Tracking local
    renderRooms() // ← Actualiza UI
}
```

**Diferencia clave:** Las salas se gestionan via **WebSocket directo** (sin pasar por API REST). El cliente emite `room:join` y el servidor lo procesa en `registerConnectionHandlers()`.

### renderRooms() — Tags visuales

```javascript
function renderRooms() {
    const container = document.getElementById('room-tags')
    updateMetric('metric-rooms', rooms.size)

    if (rooms.size === 0) {
        container.innerHTML = '<span class="empty-state">Sin salas</span>'
        return
    }

    container.innerHTML = ''
    for (const room of rooms) {
        const tag = document.createElement('span')
        tag.className = 'room-tag'
        tag.innerHTML = `${room} <span class="remove" onclick="app.removeRoom('${room}')">×</span>`
        container.appendChild(tag)
    }
}
```

Cada sala se muestra como un **tag** con botón de cierre (`×`).

---

## 11. Event Log en Tiempo Real

### logEvent()

```javascript
function logEvent(type, eventName, data) {
    const log = document.getElementById('event-log')

    // Elimina el placeholder si existe
    const empty = log.querySelector('.empty-state')
    if (empty) empty.remove()

    const entry = document.createElement('div')
    entry.className = `event-entry ${type}`

    const now = new Date().toLocaleTimeString('es-ES', { hour12: false })

    if (type === 'system' || type === 'error') {
        entry.innerHTML = `
            <span class="time">${now}</span>
            <span class="event-name">[sistema]</span>
            <span class="event-data">${eventName}</span>
        `
    } else {
        entry.innerHTML = `
            <span class="time">${now}</span>
            <span class="event-name">${eventName}</span>
            <span class="event-data">${JSON.stringify(data)}</span>
        `
    }

    // Inserta al inicio (más reciente arriba)
    log.insertBefore(entry, log.firstChild)

    // Limita a 200 entradas para evitar memory leaks
    while (log.children.length > 200) {
        log.removeChild(log.lastChild)
    }
}
```

### Tipos de entrada:

| Tipo     | Color   | Ejemplo                                      |
| -------- | ------- | -------------------------------------------- |
| `system` | Gris    | `[sistema] ✅ Conectado — Socket ID: abc123` |
| `error`  | Rojo    | `[sistema] ❌ Error de conexión: ...`        |
| `event`  | Violeta | `notification:send { "message": "Hola" }`    |

### Animación de entrada:

```css
.event-entry {
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

Cada nueva entrada se desliza suavemente desde arriba.

---

## 12. ¿Por qué CORS y Puerto Separado?

### El problema

Cuando el frontend (`:5173`) hace `fetch()` al backend (`:3000`), el navegador bloquea la request por **Same-Origin Policy**. Son orígenes diferentes porque el **puerto** difiere.

### La solución

El backend configura CORS para permitir requests desde el playground:

```typescript
// WebSocketService.ts
this.io = new SocketServer(httpServer, {
    cors: {
        origin: corsOrigins, // ['http://localhost:5173']
        credentials: true, // Permite cookies cross-origin
    },
})
```

### Configuración necesaria (`.env`):

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### ¿Qué pasa con `credentials: 'include'`?

Cuando usas `credentials: 'include'` en `fetch()`, el navegador:

1. **Envía** las cookies del dominio destino (`:3000`) aunque el request venga de otro origen (`:5173`).
2. **Requiere** que el servidor responda con `Access-Control-Allow-Credentials: true`.
3. **Requiere** que `Access-Control-Allow-Origin` NO sea `*` (debe ser el origen exacto).

---

## 13. Cómo Ejecutar

### Requisitos:

- Backend corriendo en `http://localhost:3000`
- `CORS_ORIGINS` incluye `http://localhost:5173`
- Un usuario creado en la base de datos

### Comandos:

```bash
# Terminal 1: Backend (con logs debug)
LOG_LEVEL=debug pnpm run dev

# Terminal 2: Playground
node ws-playground/serve.js
```

### Flujo de uso:

1. Abrir **http://localhost:5173**
2. Ingresar email/username y contraseña → **🔑 Login**
3. El playground hace automáticamente: CSRF → Login → WebSocket Connect
4. Verificar que ambos badges estén verdes
5. Probar cada sección:
    - **Emitir a Usuario** — Poner tu propio userId y enviar
    - **Broadcast** — Enviar a todos
    - **Status Bar** — Poner tu userId, elegir pasos y delay, iniciar
    - **Salas** — Unirse, emitir, salir
6. Observar el **Event Log** para ver todos los eventos en tiempo real
7. Observar la **terminal del backend** para ver los `log.debug`

### Ejemplo de logs del backend:

```
debug [NotificationBO] emitToUser { userId: "42", event: "notification:send" }
debug [WebSocket] Socket abc123 unido a sala: dashboard
debug [NotificationBO] simulate started { userId: "42", steps: 8, delayMs: 600 }
debug [NotificationBO] chunk emitted { taskId: "task_170...", step: 1, percent: 13, label: "Inicializando entorno…" }
debug [NotificationBO] chunk emitted { taskId: "task_170...", step: 2, percent: 25, label: "Conectando a servicios externos…" }
...
debug [NotificationBO] simulate complete { taskId: "task_170..." }
```
