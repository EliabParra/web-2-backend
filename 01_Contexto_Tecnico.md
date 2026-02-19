# 1. Stack Detectado
* Node.js, Express, TypeScript (Estricto). Contenedor IoC (`Container.getInstance()`).

# 2. Reglas de Estilo y Skills (Obligatorio)
* Lee y aplica los estándares de `.agents/skills/clean-code/SKILL.md`, `.agents/skills/solid/SKILL.md` y `.agents/skills/typescript-advanced-types/SKILL.md`.
* Aplica el Principio de Responsabilidad Única (SRP): Si un método hace varias cosas (ej: inicializar Redis y configurar middlewares), **divídelo** en métodos privados más pequeños.
* Todos los métodos y clases deben documentarse con **TypeDoc en español**.

# 3. Definiciones de Datos y Contratos
* **Configuración (`src/config/schemas/`):** Añadir bandera `websocket: { adapter: z.enum(['memory', 'redis']).default('memory') }`.
* **Estado Local:** La clase mantendrá `private localConnections = new Map<string, Set<string>>();`.
* **Contrato a crear (`src/types/websocket.ts`):**
```typescript
export interface IWebSocketService {
    initialize(httpServer: any): Promise<void>;
    emitToUser(userId: string, event: string, payload: any): void;
    broadcast(event: string, payload: any): void;
    emitToRoom(roomName: string, event: string, payload: any): void;
    addUserToRoom(userId: string, roomName: string): void;
    removeUserFromRoom(userId: string, roomName: string): void;
    getLocalConnectionsCount(): number;
    shutdown(): Promise<void>;
}
```