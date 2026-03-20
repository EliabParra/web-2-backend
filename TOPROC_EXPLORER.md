# 📄 SPEC: Toproc Explorer (MVP)
**Contexto del Proyecto:** [AGENTS.md](AGENTS.md)
**Objetivo:** Construir el "Toproc Explorer", una interfaz gráfica aislada y protegida para probar transacciones (`tx`) dinámicamente desde el navegador.

## 1. Reglas Arquitectónicas Estrictas (INNEGOCIABLES)
- **Cero acoplamiento:** Todo el código del Explorer debe vivir exclusivamente en `scripts/explorer/`.
- **Cero dependencias frontend:** La interfaz (`index.html`) debe ser un único archivo usando Vanilla JS y TailwindCSS por CDN. Cero React, cero bundlers.
- **Seguridad simple:** El endpoint debe estar protegido por un middleware de Express que exija un secreto mediante Query Param o Header (`?key=toproc123`).
- **Parser basado en AST/Regex:** El escáner de transacciones debe leer código fuente `.ts` directamente, sin intentar compilar ni importar los módulos dinámicamente (para evitar errores de dependencias en tiempo de escaneo).

## 2. Árbol de Archivos Esperado
```text
scripts/
└── explorer/
    ├── generate.ts    # CLI Script: Escanea BOs y genera spec.json
    ├── router.ts      # Express Router: Protege y sirve la UI
    └── index.html     # UI: Interfaz gráfica (Single Page)
```

---

## 3. Especificación de Módulos (Tareas para la IA)

### Módulo A: El Escáner (`scripts/explorer/generate.ts`)
**Función:** Leer todos los archivos `*BO.ts` en el directorio `../../BO/`, extraer los métodos transaccionales, cruzar datos con `*Schemas.ts` y exportar un `spec.json`.

**Lógica de Extracción (Paso a paso):**
1. Recorrer recursivamente `../../BO/`. Ignorar archivos que contengan `BaseBO`.
2. Por cada archivo `*BO.ts` encontrado, buscar métodos con la firma: `async nombreMetodo(params: Inputs.NombreInput)`.
3. Por cada método encontrado, deducir la ruta del archivo de esquemas cambiando la extensión (`NombreBO.ts` -> `NombreSchemas.ts`).
4. Leer el archivo `NombreSchemas.ts` y buscar la definición de Zod correspondiente (ej. `nombreMetodo: z.object({ ... })`).
5. Extraer las claves del esquema de Zod (ej. `email`, `password`) usando expresiones regulares.
6. Construir un array de objetos con esta estructura:
   ```json
   {
     "tx": 1, // Autoincremental
     "name": "AuthBO.register",
     "description": "Auto-generado de AuthBO.ts",
     "payloadSchema": { "email": "string", "password": "string" }
   }
   ```
7. Escribir el array en `scripts/explorer/spec.json`.

### Módulo B: El Router (`scripts/explorer/router.ts`)
**Función:** Un mini-middleware de Express que sirve los archivos estáticos bajo protección.

**Requisitos de Implementación:**
1. Exportar un `explorerRouter` de tipo `express.Router()`.
2. Crear un middleware `protectExplorer` que verifique si `req.query.key === 'toproc123'` o `req.headers['x-explorer-key'] === 'toproc123'`. Si falla, devolver `403 Forbidden`.
3. Ruta `GET /spec`: Servir el archivo `spec.json` generado por el Módulo A. Manejar el error si el archivo no existe (HTTP 404).
4. Ruta `GET /`: Servir el archivo estático `index.html`.

### Módulo C: La Interfaz (`scripts/explorer/index.html`)
**Función:** Renderizar la especificación y permitir la ejecución de transacciones apuntando a la API de Toproc.

**Requisitos de UI/UX:**
1. Usar `<script src="https://cdn.tailwindcss.com"></script>` con soporte para Dark Mode (`class="dark bg-slate-950"`).
2. Layout: Sidebar izquierdo (Lista de TX) y Main content derecho (Formulario + Respuesta).
3. **Flujo JavaScript:**
   - Extraer el Query Param `?key=` de la URL actual.
   - Hacer `fetch('/explorer/spec?key=...')` al cargar.
   - Dibujar la lista lateral de botones con los `tx.name`.
4. **Dibujado del Formulario:**
   - Al hacer clic en una transacción, generar `<input>` por cada llave en `payloadSchema`.
   - Mostrar un input numérico editable para "TX ID" (por si el autoincremental falló, permitir "Override").
5. **Ejecución:**
   - Botón "Ejecutar Transacción".
   - Recolectar values de los inputs. Parsear números enteros y booleanos automáticamente si es posible.
   - Hacer `POST` a `/toProccess` con el body: `{ "tx": ID, "params": { ... } }`.
   - Mostrar la respuesta (JSON) en un bloque `<pre class="text-emerald-400">`. Atrapar errores de red e imprimirlos en texto rojo.

### Módulo D: Integración del Comando CLI (`package.json`)
**Función:** Crear el atajo para que el usuario pueda generar el explorer con un solo comando.

**Requisitos de Implementación:**
1. Modificar el archivo `package.json` en la raíz del proyecto.
2. Añadir el siguiente script en la sección `"scripts"`:
   `"explorer": "ts-node scripts/explorer/generate.ts"` (o el equivalente usando `tsx` o tu runner actual).

---

## 4. Instrucción Final de Integración
La IA no debe modificar `AppServer.ts` directamente, sino entregar el fragmento exacto que el usuario debe pegar, el cual será:
```typescript
import { explorerRouter } from '../scripts/explorer/router.js';
// ... dentro de la inicialización de Express
if (process.env.NODE_ENV !== 'production') {
    app.use('/explorer', explorerRouter);
}
```