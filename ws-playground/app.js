/**
 * WebSocket Playground — App Client
 *
 * Maneja la conexión Socket.io, autenticación via CSRF + sesión,
 * envío de eventos via API REST, y actualización de la UI en tiempo real.
 */
const app = (() => {
    let socket = null
    let eventCount = 0
    let sentCount = 0
    let csrfToken = null
    const rooms = new Set()

    // ═══════════════════════════════════════════════════════════════════════
    // Helpers comunes
    // ═══════════════════════════════════════════════════════════════════════

    function getBackendUrl() {
        return document.getElementById('backend-url').value.trim()
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Autenticación
    // ═══════════════════════════════════════════════════════════════════════

    async function fetchCsrfToken() {
        const url = getBackendUrl()
        try {
            const res = await fetch(`${url}/csrf`, {
                credentials: 'include',
            })
            const json = await res.json()
            csrfToken = json.csrfToken
            logEvent('system', `🔒 CSRF token obtenido: ${csrfToken.substring(0, 8)}...`)
            return csrfToken
        } catch (err) {
            logEvent('error', `Error obteniendo CSRF token: ${err.message}`)
            return null
        }
    }

    async function login() {
        const identifier = document.getElementById('login-identifier').value.trim()
        const password = document.getElementById('login-password').value.trim()

        if (!identifier || !password) {
            logEvent('error', 'Email/username y contraseña son requeridos')
            return
        }

        setAuthStatus('connecting', 'Autenticando...')
        logEvent('system', `🔑 Iniciando login para: ${identifier}`)

        // Paso 1: Obtener CSRF token
        const token = await fetchCsrfToken()
        if (!token) {
            setAuthStatus('disconnected', 'Sin sesión')
            return
        }

        // Paso 2: Login
        const url = getBackendUrl()
        try {
            const res = await fetch(`${url}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': token,
                },
                credentials: 'include',
                body: JSON.stringify({ identifier, password }),
            })

            const json = await res.json()

            if (res.ok) {
                setAuthStatus('connected', `Sesión: ${identifier}`)
                const authInfo = document.getElementById('auth-info')
                authInfo.textContent = `✅ Login exitoso — userId: ${json.user?.user_id ?? '?'} | profileId: ${json.user?.profile_id ?? '?'}`
                logEvent('system', `✅ Login exitoso: ${JSON.stringify(json)}`)

                // Auto-conectar WebSocket tras login
                connect()
            } else {
                setAuthStatus('disconnected', 'Sin sesión')
                logEvent('error', `❌ Login fallido: ${json.msg || JSON.stringify(json)}`)
                const authInfo = document.getElementById('auth-info')
                authInfo.textContent = `❌ ${json.msg || 'Error de autenticación'}`
            }
        } catch (err) {
            setAuthStatus('disconnected', 'Sin sesión')
            logEvent('error', `Error en login: ${err.message}`)
        }
    }

    async function logout() {
        const url = getBackendUrl()

        // Desconectar WebSocket primero
        if (socket?.connected) {
            disconnect()
        }

        try {
            const res = await fetch(`${url}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({}),
            })

            const json = await res.json()
            csrfToken = null
            setAuthStatus('disconnected', 'Sin sesión')
            document.getElementById('auth-info').textContent = '🚪 Sesión cerrada'
            logEvent('system', `🚪 Logout: ${JSON.stringify(json)}`)
        } catch (err) {
            logEvent('error', `Error en logout: ${err.message}`)
        }
    }

    function setAuthStatus(state, text) {
        const badge = document.getElementById('auth-badge')
        const label = document.getElementById('auth-text')
        badge.className = `status-badge ${state}`
        label.textContent = text
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Conexión
    // ═══════════════════════════════════════════════════════════════════════

    function connect() {
        const url = getBackendUrl()
        if (!url) return

        if (socket?.connected) {
            logEvent('system', 'Ya estás conectado')
            return
        }

        setStatus('connecting', 'Conectando...')
        logEvent('system', `Conectando a ${url}...`)

        socket = io(url, {
            transports: ['websocket'],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        })

        socket.on('connect', () => {
            setStatus('connected', `Conectado (${socket.id})`)
            updateMetric('metric-socketid', socket.id.substring(0, 8))
            logEvent('system', `✅ Conectado — Socket ID: ${socket.id}`)
        })

        socket.on('disconnect', (reason) => {
            setStatus('disconnected', 'Desconectado')
            updateMetric('metric-socketid', '—')
            logEvent('system', `⛔ Desconectado — Razón: ${reason}`)
        })

        socket.on('connect_error', (err) => {
            setStatus('disconnected', 'Error de conexión')
            logEvent('error', `❌ Error de conexión: ${err.message}`)
        })

        // Listener específico para progress:update → actualiza la barra
        socket.on('progress:update', (data) => {
            updateProgressBar(data)
        })

        // Escuchar TODOS los eventos entrantes
        socket.onAny((eventName, ...args) => {
            eventCount++
            updateMetric('metric-events', eventCount)
            logEvent('event', eventName, args[0])
        })
    }

    function disconnect() {
        if (!socket) return
        socket.disconnect()
        socket = null
        rooms.clear()
        renderRooms()
        logEvent('system', 'Desconexión manual')
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Enviar a Usuario (via API REST → BO → WebSocket)
    // ═══════════════════════════════════════════════════════════════════════

    async function sendToUser() {
        const userId = document.getElementById('emit-user-id').value.trim()
        const event = document.getElementById('emit-user-event').value.trim()
        const message = document.getElementById('emit-user-message').value.trim()

        if (!userId || !event || !message) {
            logEvent('error', 'Todos los campos son requeridos para emitir a usuario')
            return
        }

        const url = getBackendUrl()

        try {
            logEvent('system', `📤 Enviando via API: emitToUser("${userId}", "${event}", ...)`)

            const res = await fetch(`${url}/toProccess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({
                    tx: 'Notification.send',
                    data: { userId, event, message },
                }),
            })

            const json = await res.json()
            sentCount++
            updateMetric('metric-sent', sentCount)
            logEvent('system', `📨 API Response: ${JSON.stringify(json)}`)
        } catch (err) {
            logEvent('error', `Error API: ${err.message}`)
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Broadcast (via API REST → BO → WebSocket)
    // ═══════════════════════════════════════════════════════════════════════

    async function sendBroadcast() {
        const event = document.getElementById('broadcast-event').value.trim()
        const message = document.getElementById('broadcast-message').value.trim()

        if (!event || !message) {
            logEvent('error', 'Evento y mensaje son requeridos para broadcast')
            return
        }

        const url = getBackendUrl()

        try {
            logEvent('system', `📤 Enviando via API: broadcast("${event}", ...)`)

            const res = await fetch(`${url}/toProccess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({
                    tx: 'Notification.broadcast',
                    data: { event, message },
                }),
            })

            const json = await res.json()
            sentCount++
            updateMetric('metric-sent', sentCount)
            logEvent('system', `📨 API Response: ${JSON.stringify(json)}`)
        } catch (err) {
            logEvent('error', `Error API: ${err.message}`)
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Simulación Status Bar (via API REST → BO → WebSocket chunks)
    // ═══════════════════════════════════════════════════════════════════════

    async function startSimulation() {
        const userId = document.getElementById('sim-user-id').value.trim()
        const steps = parseInt(document.getElementById('sim-steps').value) || 8
        const delayMs = parseInt(document.getElementById('sim-delay').value) || 600

        if (!userId) {
            logEvent('error', 'User ID es requerido para la simulación')
            return
        }

        if (!socket?.connected) {
            logEvent('error', 'Primero debes conectarte al servidor')
            return
        }

        // Reset progress bar
        resetProgressBar()

        const url = getBackendUrl()

        try {
            logEvent('system', `⏳ Iniciando simulación: ${steps} pasos, ${delayMs}ms delay`)

            const res = await fetch(`${url}/toProccess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({
                    tx: 'Notification.simulate',
                    data: { userId, steps, delayMs },
                }),
            })

            const json = await res.json()
            sentCount++
            updateMetric('metric-sent', sentCount)
            logEvent('system', `📨 Simulación lanzada: ${JSON.stringify(json)}`)
        } catch (err) {
            logEvent('error', `Error API: ${err.message}`)
        }
    }

    function updateProgressBar(data) {
        const bar = document.getElementById('progress-bar')
        const label = document.getElementById('progress-label')
        const percent = document.getElementById('progress-percent')
        const stepInfo = document.getElementById('progress-step')

        bar.style.width = `${data.percent}%`
        label.textContent = data.label
        percent.textContent = `${data.percent}%`
        stepInfo.textContent = `Paso ${data.step}/${data.totalSteps} — taskId: ${data.taskId}`

        if (data.status === 'completed') {
            bar.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)'
            label.textContent = '✅ ' + data.label
        }
    }

    function resetProgressBar() {
        const bar = document.getElementById('progress-bar')
        bar.style.width = '0%'
        bar.style.background = 'linear-gradient(90deg, var(--accent), var(--info))'
        document.getElementById('progress-label').textContent = 'Iniciando…'
        document.getElementById('progress-percent').textContent = '0%'
        document.getElementById('progress-step').textContent = '—'
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Salas (Rooms) — comunicación directa via Socket.io
    // ═══════════════════════════════════════════════════════════════════════

    function joinRoom() {
        const roomName = document.getElementById('room-name').value.trim()
        if (!roomName) return
        if (!socket?.connected) {
            logEvent('error', 'Primero debes conectarte al servidor')
            return
        }

        socket.emit('room:join', { roomName })
        rooms.add(roomName)
        renderRooms()
        logEvent('system', `🏠 Solicitado unirse a sala: ${roomName}`)
    }

    function leaveRoom() {
        const roomName = document.getElementById('room-name').value.trim()
        if (!roomName) return
        if (!socket?.connected) return

        socket.emit('room:leave', { roomName })
        rooms.delete(roomName)
        renderRooms()
        logEvent('system', `🚪 Solicitado salir de sala: ${roomName}`)
    }

    async function emitToRoom() {
        const roomName = document.getElementById('room-emit-name').value.trim()
        const event = document.getElementById('room-emit-event').value.trim()
        const message = document.getElementById('room-emit-message').value.trim()

        if (!roomName || !event || !message) {
            logEvent('error', 'Sala, evento y mensaje son requeridos')
            return
        }

        if (!socket?.connected) {
            logEvent('error', 'Primero debes conectarte al servidor')
            return
        }

        socket.emit('room:emit', { roomName, event, message })
        sentCount++
        updateMetric('metric-sent', sentCount)
        logEvent('system', `📤 Emitido a sala "${roomName}": ${event}`)
    }

    function removeRoom(roomName) {
        if (socket?.connected) {
            socket.emit('room:leave', { roomName })
        }
        rooms.delete(roomName)
        renderRooms()
        logEvent('system', `🚪 Sala abandonada: ${roomName}`)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UI Helpers
    // ═══════════════════════════════════════════════════════════════════════

    function setStatus(state, text) {
        const badge = document.getElementById('status-badge')
        const label = document.getElementById('status-text')
        badge.className = `status-badge ${state}`
        label.textContent = text
    }

    function updateMetric(id, value) {
        document.getElementById(id).textContent = value
    }

    function logEvent(type, eventName, data) {
        const log = document.getElementById('event-log')
        const empty = log.querySelector('.empty-state')
        if (empty) empty.remove()

        const entry = document.createElement('div')
        entry.className = `event-entry ${type}`

        const now = new Date().toLocaleTimeString('es-ES', { hour12: false })

        if (type === 'system' || type === 'error') {
            entry.innerHTML = `
                <span class="time">${now}</span>
                <span class="event-name ${type === 'error' ? 'error' : ''}">[sistema]</span>
                <span class="event-data">${eventName}</span>
            `
        } else {
            const dataStr = data ? JSON.stringify(data) : ''
            entry.innerHTML = `
                <span class="time">${now}</span>
                <span class="event-name">${eventName}</span>
                <span class="event-data">${dataStr}</span>
            `
        }

        log.insertBefore(entry, log.firstChild)

        while (log.children.length > 200) {
            log.removeChild(log.lastChild)
        }
    }

    function renderRooms() {
        const container = document.getElementById('room-tags')
        updateMetric('metric-rooms', rooms.size)

        if (rooms.size === 0) {
            container.innerHTML = '<span class="empty-state" style="padding:8px; font-size: 0.75rem">Sin salas</span>'
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

    function clearLog() {
        const log = document.getElementById('event-log')
        log.innerHTML = '<div class="empty-state">Log limpiado</div>'
        eventCount = 0
        sentCount = 0
        updateMetric('metric-events', 0)
        updateMetric('metric-sent', 0)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // API Pública
    // ═══════════════════════════════════════════════════════════════════════

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
