/**
 * WebSocket Playground — App Client
 *
 * Maneja la conexión Socket.io, autenticación via CSRF + sesión,
 * envío de eventos via API REST, y actualización de la UI en tiempo real.
 */
const app = (() => {
    let socket = null
    const nspSockets = {}
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
                // Guardar identificador para restaurar sesión al recargar la página
                localStorage.setItem('ws_user_id', identifier)
                if (json.user?.user_id) {
                    localStorage.setItem('ws_user_numeric', json.user.user_id)
                }

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
            localStorage.removeItem('ws_user_id')
            localStorage.removeItem('ws_user_numeric')

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

            // Skip showing toast for connect/disconnect as they have their own badges
            if (['connect', 'disconnect', 'connect_error'].includes(eventName)) return

            // Show beautiful toast notification
            const payload = args[0] || {}
            let title = `Evento: ${eventName}`
            let message = payload.message || JSON.stringify(payload)
            let type = 'info'

            if (eventName.includes('success')) type = 'success'
            if (eventName.includes('error')) type = 'error'
            if (eventName === 'progress:update') type = 'progress'

            if (eventName === 'progress:update') {
                title = `Progreso: ${payload.label || 'Procesando...'}`
                message = `${payload.percent}% completado (${payload.step}/${payload.totalSteps})`
                showToast(title, message, type, payload.percent)
            } else {
                showToast(title, message, type)
            }
        })
    }

    function connectToNamespace(namespace) {
        if (!namespace || namespace === '/') return socket
        if (nspSockets[namespace]) return nspSockets[namespace]

        const url = getBackendUrl()
        const nspUrl = `${url}${namespace.startsWith('/') ? '' : '/'}${namespace}`

        logEvent('system', `🔌 Autoconectando a namespace: ${namespace}`)
        
        const newSocket = io(nspUrl, {
            transports: ['websocket'],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        })

        newSocket.on('connect', () => {
            logEvent('system', `✅ Conectado a namespace: ${namespace}`)
        })

        newSocket.on('disconnect', (reason) => {
            logEvent('system', `⛔ Desconectado de namespace ${namespace}: ${reason}`)
            delete nspSockets[namespace]
        })

        newSocket.on('connect_error', (err) => {
            logEvent('error', `❌ Error en namespace ${namespace}: ${err.message}`)
        })

        newSocket.onAny((eventName, ...args) => {
            if (['connect', 'disconnect', 'connect_error'].includes(eventName)) return

            eventCount++
            updateMetric('metric-events', eventCount)
            logEvent('event', `[${namespace}] ${eventName}`, args[0])

            const payload = args[0] || {}
            const title = `[${namespace}] ${eventName}`
            const message = payload.message || JSON.stringify(payload)
            let type = 'info'

            if (eventName.includes('success')) type = 'success'
            if (eventName.includes('error')) type = 'error'

            showToast(title, message, type)
        })

        nspSockets[namespace] = newSocket
        return newSocket
    }

    function disconnect() {
        if (socket) {
            socket.disconnect()
            socket = null
        }
        for (const [nsp, s] of Object.entries(nspSockets)) {
            if (s) s.disconnect()
            delete nspSockets[nsp]
        }
        rooms.clear()
        renderRooms()
        logEvent('system', 'Desconexión manual')
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Enviar a Usuario (via API REST → BO → WebSocket)
    // ═══════════════════════════════════════════════════════════════════════

    async function sendToUser() {
        const userId = document.getElementById('emit-user-id').value.trim()
        const message = document.getElementById('emit-user-message').value.trim()

        if (!userId || !message) {
            logEvent('error', 'User ID y mensaje son requeridos')
            return
        }

        const url = getBackendUrl()

        try {
            logEvent('system', `📤 Enviando via API: emitToUser("${userId}", "${event}", ...)`)

            const payload = {
                tx: 8, // Notification.send
                params: { userId, message },
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
        const message = document.getElementById('broadcast-message').value.trim()

        if (!message) {
            logEvent('error', 'Mensaje es requerido para broadcast')
            return
        }

        const url = getBackendUrl()

        try {
            logEvent('system', `📤 Enviando via API: broadcast("${event}", ...)`)

            const payload = {
                tx: 9, // Notification.broadcast
                params: { message },
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

            const payload = {
                tx: 10, // Notification.simulate
                params: { userId, steps, delayMs },
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

    async function joinRoom() {
        const roomName = document.getElementById('room-name').value.trim()
        const namespace = document.getElementById('room-namespace').value.trim() || undefined
        if (!roomName) return
        if (!socket?.connected) {
            logEvent('error', 'Primero debes conectarte al servidor')
            return
        }

        const userId = localStorage.getItem('ws_user_numeric') || '0'
        const tagKey = namespace ? `${namespace}:${roomName}` : roomName

        if (namespace) {
            connectToNamespace(namespace)
        }

        try {
            logEvent('system', `🏠 Solicitando unirse a sala via API: ${tagKey}`)
            const res = await fetch(`${getBackendUrl()}/toProccess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ tx: 11, params: { userId, roomName, namespace } }),
            })
            const json = await res.json()
            if (res.ok) {
                rooms.add(tagKey)
                renderRooms()
                logEvent('system', `✅ Unido a la sala: ${JSON.stringify(json)}`)
            } else {
                logEvent('error', `❌ Error uniendo a sala: ${JSON.stringify(json)}`)
            }
        } catch (err) {
            logEvent('error', `Error API: ${err.message}`)
        }
    }

    async function leaveRoom() {
        const roomName = document.getElementById('room-name').value.trim()
        const namespace = document.getElementById('room-namespace').value.trim() || undefined
        if (!roomName) return
        if (!socket?.connected) return

        const userId = localStorage.getItem('ws_user_numeric') || '0'
        const tagKey = namespace ? `${namespace}:${roomName}` : roomName

        try {
            logEvent('system', `🚪 Solicitando salir de sala via API: ${tagKey}`)
            const res = await fetch(`${getBackendUrl()}/toProccess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ tx: 12, params: { userId, roomName, namespace } }),
            })
            const json = await res.json()
            if (res.ok) {
                rooms.delete(tagKey)
                renderRooms()
                logEvent('system', `✅ Salida exitosa: ${JSON.stringify(json)}`)
            }
        } catch (err) {
            logEvent('error', `Error API: ${err.message}`)
        }
    }

    async function emitToRoom() {
        const roomName = document.getElementById('room-emit-name').value.trim()
        const namespace = document.getElementById('room-emit-namespace').value.trim() || undefined
        const message = document.getElementById('room-emit-message').value.trim()

        if (!roomName || !message) {
            logEvent('error', 'Sala y mensaje son requeridos')
            return
        }

        if (!socket?.connected) {
            logEvent('error', 'Primero debes conectarte al servidor')
            return
        }

        const userId = localStorage.getItem('ws_user_numeric') || '0'
        const tagKey = namespace ? `${namespace}:${roomName}` : roomName

        try {
            logEvent('system', `📤 Emitiendo a sala via API "${tagKey}": ${event}`)
            const res = await fetch(`${getBackendUrl()}/toProccess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ tx: 13, params: { userId, roomName, message, namespace } }),
            })
            const json = await res.json()
            sentCount++
            updateMetric('metric-sent', sentCount)
            logEvent('system', `📨 API Response: ${JSON.stringify(json)}`)
        } catch (err) {
            logEvent('error', `Error API: ${err.message}`)
        }
    }

    async function removeRoom(tagKey) {
        if (socket?.connected) {
            const userId = localStorage.getItem('ws_user_numeric') || '0'
            const parts = tagKey.split(':')
            const roomName = parts.length > 1 ? parts[1] : parts[0]
            const namespace = parts.length > 1 ? parts[0] : undefined
            
            await fetch(`${getBackendUrl()}/toProccess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ tx: 12, params: { userId, roomName, namespace } }),
            })
        }
        rooms.delete(tagKey)
        renderRooms()
        logEvent('system', `🚪 Sala abandonada y borrada tag: ${tagKey}`)
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
            container.innerHTML =
                '<span class="empty-state" style="padding:8px; font-size: 0.75rem">Sin salas</span>'
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
    // Inicialización (Restaurar sesión al recargar)
    // ═══════════════════════════════════════════════════════════════════════

    async function init() {
        // Auto-detect the correct backend IP if accessing from a local network via phone
        const urlInput = document.getElementById('backend-url')
        urlInput.value = `${window.location.protocol}//${window.location.hostname}:3000`

        const savedUser = localStorage.getItem('ws_user_id')
        if (savedUser) {
            setAuthStatus('connecting', 'Restaurando...')
            logEvent('system', `Intentando restaurar sesión para: ${savedUser}`)

            const token = await fetchCsrfToken()
            if (token) {
                setAuthStatus('connected', `Sesión: ${savedUser}`)
                // Solo restauramos la info visual, pero el CSRF ya permite emitir.
                // Conectar el socket validará automáticamente si la sesión backend sigue viva.
                connect()
            } else {
                localStorage.removeItem('ws_user_id')
                setAuthStatus('disconnected', 'Sin sesión')
            }
        }
    }

    // Ejecutar inicialización asíncrona pero sin bloquear
    setTimeout(init, 100)

    // ═══════════════════════════════════════════════════════════════════════
    // API Pública
    // ═══════════════════════════════════════════════════════════════════════
    // Utilidades UI (Toasts y Status)
    // ═══════════════════════════════════════════════════════════════════════

    function showToast(title, message, type = 'info', progress = null) {
        const container = document.getElementById('toast-container')
        if (!container) return

        const toast = document.createElement('div')
        toast.className = `toast ${type}`

        let icon = '🔔'
        if (type === 'success') icon = '✅'
        if (type === 'progress') icon = '⏳'
        if (type === 'error') icon = '❌'

        let progressHtml = ''
        if (progress !== null && type === 'progress') {
            progressHtml = `
                <div class="toast-progress-bar">
                    <div class="toast-progress-fill" style="width: ${progress}%"></div>
                </div>
            `
        }

        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-icon">${icon}</span>
                <span>${title}</span>
            </div>
            <div class="toast-body">${message}</div>
            ${progressHtml}
        `

        container.appendChild(toast)

        // Trigger reflow for animation
        void toast.offsetWidth

        toast.classList.add('show')

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show')
            toast.classList.add('hide')
            setTimeout(() => {
                toast.remove()
            }, 400) // wait for animation
        }, 5000)
    }

    // Exportar al objeto global (window.app)
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
        showToast,
    }
})()
