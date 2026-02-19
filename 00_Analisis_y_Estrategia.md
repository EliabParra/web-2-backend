# 1. Objetivo del Sprint
Implementar el módulo `WebSocketService`, un wrapper para `socket.io` diseñado bajo una **Arquitectura Híbrida Guiada por Configuración**. Soportará ejecución en Memoria Local para desarrollo y Adaptador Redis (Pub/Sub) para alta disponibilidad en producción. Se incluirá gestión avanzada de Salas (Rooms) nativas.

# 2. Análisis Crítico del Estado Actual
* **Riesgo de Inyección:** El servicio debe acoplarse al middleware de sesión existente en `AppServer.ts` para rechazar handshakes no autenticados.
* **Manejo de Memoria (Code Smell a evitar):** Aunque usemos Redis, mantendremos un diccionario local (`Map`) exclusivamente para tracking y métricas del nodo físico. Este diccionario debe limpiarse meticulosamente en el evento `disconnect` para evitar fugas de memoria.

# 3. Plan de Arquitectura
* **Patrón de Enrutamiento:** No iteraremos sobre diccionarios para enviar mensajes. Usaremos el poder nativo de las Salas de Socket.io. Al conectarse, cada socket hará `join('user_{userId}')`. Emitir a un usuario será siempre `io.to('user_{userId}').emit(...)`, delegando el ruteo multi-nodo al adaptador (sea Memoria o Redis).
* **Fases Estrictas de Ejecución:** El desarrollo se dividirá en 5 Fases controladas. El Agente tiene prohibido avanzar sin aprobación explícita del usuario.