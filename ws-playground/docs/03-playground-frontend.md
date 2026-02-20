# Playground Frontend — Guía Detallada

> **Directorio:** `ws-playground/`
> **Responsabilidad:** Aplicación frontend standalone que demuestra y prueba todas las funcionalidades del servicio WebSocket en tiempo real.

---

## Tabla de Contenidos

1. [Arquitectura del Playground](#1-arquitectura-del-playground)
2. [Servidor Estático — serve.js](#2-servidor-estático--servejs)
3. [App.js — Lógica de Estado y Modularización](#3-appjs--lógica-de-estado-y-modularización)
4. [Flujo de Autenticación (CSRF + Login)](#4-flujo-de-autenticación-csrf--login)
5. [Conexión WebSocket y Notificaciones Toast UI](#5-conexión-websocket-y-notificaciones-toast-ui)
6. [Emisión via API REST → BO → WebSocket](#6-emisión-via-api-rest--bo--websocket)
7. [Simulación de Progreso Async](#7-simulación-de-progreso-async)
8. [Gestión de Salas (Rooms)](#8-gestión-de-salas-rooms)
9. [Restauración Automática de Sesión](#9-restauración-automática-de-sesión)
10. [Cómo Ejecutar](#10-cómo-ejecutar)

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

## 3. App.js — Lógica de Estado y Modularización

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

1. **Encapsulación** — Las variables internas (`socket`, `csrfToken`, etc.) son inaccesibles desde fuera limitando su mutabilidad incontrolada.
2. **API pública limpia** — Solo se exponen las funciones que el HTML necesita en llamadas `onclick="app.startSimulation()"`.
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

## 4. Flujo de Autenticación (CSRF + Login)

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

## 5. Conexión WebSocket y Notificaciones Toast UI

```javascript
function connect() {
    socket = io(url, {
        transports: ['websocket'],      // Solo WebSocket directo
        withCredentials: true,          // Impulsa cookie `connect.sid`
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
    })
```

Aparte de la configuración, el gran logro visual del **Frontend App** recae en su sistema de alertas (Toasts) acoplado uniformemente a `socket.onAny(..)` para que toda entrada despierte a Toastify.

### Integración de Alertas Toastify `socket.onAny`:

```javascript
socket.onAny((eventName, ...args) => {
    eventCount++
    updateMetric('metric-events', eventCount)
    logEvent('event', eventName, args[0])

    const payload = args[0] || {}
    let type = 'info'
    if (eventName.includes('success')) type = 'success'
    if (eventName.includes('error')) type = 'error'

    // Formatear Mensajes Animados
    if (eventName === 'progress:update') {
        const title = `Progreso: ${payload.label || 'Procesando...'}`
        const message = `${payload.percent}% completado (${payload.step}/${payload.totalSteps})`

        showToast(title, message, 'progress', payload.percent)
        updateProgressBar(payload) // Extra actualización dedicada
    } else {
        showToast(`Evento: ${eventName}`, payload.message || JSON.stringify(payload), type)
    }
})
```

La lógica utiliza `Toastify`:

1. **Ataja todo** — Mapea metadato como progreso, éxito (success) y falla (error).
2. **Maneja barras insertadas** — Para `progress`, genera un Toast híbrido que exhibe internamente su propia barra de porcentaje cargándose en la propia alerta usando la misma constante matemática (`payload.percent`).

---

## 6. Emisión via API REST → BO → WebSocket

### sendToUser() y sendBroadcast()

```javascript
// La forma en la que la App emite un request
const payload = {
    tx: 8, // ID numérico atado a "Notification.send" en la DB de roles
    params: { userId, event, message },
}

const res = await fetch(`${url}/toProccess`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
})
```

**Flujo en TransactionOrchestrator:**
Frontend emite `tx: 8`. En el Backend, la base de datos convierte `8` en el `object_name: Notification` y `method_name: send`. La validación cruza por `TransactionMapper` y asegura que ese ID numérico exista, activando dinámicamente el controlador subyacente de la lógica sin revelar los nombres internos de funciones a nivel client-side HTTP!

---

## 7. Simulación de Progreso Async

### startSimulation()

```javascript
async function startSimulation() {
    const userId = document.getElementById('sim-user-id').value.trim()
    const steps = parseInt(document.getElementById('sim-steps').value) || 8
    const delayMs = parseInt(document.getElementById('sim-delay').value) || 600

    resetProgressBar()

    await fetch(`${url}/toProccess`, {
        body: JSON.stringify({
            tx: 10, // Notification.simulate Numérico
            params: { userId, steps, delayMs },
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

## 8. Gestión de Salas (Rooms)

### Unirse a Salas (`tx: 24`) y Enviar a Salas (`tx: 23`)

```javascript
function joinRoom() {
    // Para simplificar la base, las rutas HTTP manejan los uniones a salas:
    const payload = {
        tx: 24, // Notification.joinRoom
        params: { userId: currentId, roomName },
    }
    // ... Envío mediante fetch POST /toProccess
}
```

**Seguridad Backend vs WebSocket:**
Si bien `socket.emit('room:join')` existiría de modo natural, el playground utiliza la API HTTP Rest y el core del `TransactionOrchestrator` para gestionar los cambios de sala. De ese modo, las comprobaciones de perfiles se aplican antes de que el Websocket Server asigne a un `userId` en concreto a una sala.

---

## 9. Restauración Automática de Sesión

Para sobrevivir `F5` o reloads de página sin perder el token de sesión web activa, la autenticación es cacheada indirectamente localmente:

```javascript
/* Durante un login exitoso: */
localStorage.setItem('ws_user_id', json.user.username)
localStorage.setItem('ws_user_numeric', json.user.user_id)

/* Al inicializar app.js tras F5: */
async function init() {
    const savedUser = localStorage.getItem('ws_user_id')
    if (savedUser) {
        const token = await fetchCsrfToken()
        if (token) {
            connect() // Reautentica WebSocket transparentemente!
        }
    }
}
```

---

## 10. Cómo Ejecutar

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
