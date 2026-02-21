# ROL
Actúa como un Arquitecto Principal de Software, Experto en DX (Developer Experience), Ingeniero DevOps y Especialista en TypeScript/PostgreSQL.

# CONTEXTO
Lee obligatoriamente `00_Analisis_y_Estrategia.md` y `01_Contexto_Tecnico.md`. Tienes la misión de reconstruir la DX de este proyecto para que sea un estándar de clase mundial.
Aplica estrictamente las skills `clean-code`, `solid`, `typescript-advanced-types` y `docker-expert`.

# LA MISIÓN (SISTEMA DE FASES ESTRICTO)
Avanza fase por fase. **NUNCA** pases a la siguiente sin mi autorización explícita tras un commit. Usa tus herramientas (MCP) para leer el código antes de modificarlo.

### 🔴 FASE 1: Docker DX y Autoconfiguración
1. Analiza el `docker-compose.yml` actual.
2. Añade un contenedor visual para la BD (ej. `adminer` o `pgadmin4`).
3. Refactoriza para que PostgreSQL use volúmenes persistentes y tenga un script de inicialización (`init.sql`) que garantice la creación de la BD.
4. Crea en el `package.json` un comando `dx:init` que orqueste todo el levantamiento limpio.

### 🔴 FASE 2: Auditoría y Fix de Seguridad (CORS/CSRF)
1. Analiza `src/api/http/middleware/csrf.ts` y `cors.ts`.
2. Identifica por qué falla al cambiar de máquina (Validación de IP/Origin).
3. Escribe un fix robusto que, si estamos en modo `development`, permita dinámicamente orígenes de la red local (ej. `192.168.*.*`) o proporcione una excepción segura para el entorno del playground de WebSockets.

### 🔴 FASE 3: Arquitectura del Nuevo CLI de Base de Datos
1. Mueve/crea la carpeta `/migrations` en la raíz del proyecto.
2. Instala e implementa `@clack/prompts`, `ora` y `chalk` (si no están ya instalados).
3. Crea un CLI interactivo (menús navegables con teclado) con las opciones:
   - `Migrate`: Correr migraciones pendientes de `/migrations/ddl`.
   - `Reset`: Destruir esquema `public`, recrearlo y correr TODO de cero.
   - `Seed`: Ejecutar la siembra desde `/migrations/dml`.
   - `Introspect`: (Ver Fase 4).
4. Implementa el "Migration Runner" transaccional a prueba de fallos.

### 🔴 FASE 4: Motor de Introspección (El Generador Automático) y Exclusión de BOs
1. Desarrolla la lógica para el comando `Introspect` que consulte `information_schema`.
2. Debe generar automáticamente un archivo TypeScript en `/migrations/ddl/` con el código SQL (`CREATE TABLE ...`) correspondiente.
3. **REGLA CRÍTICA:** Filtra e ignora absolutamente todas las tablas relacionadas con Business Objects (BOs), transacciones y seguridad (`security_objects`, `security_methods`, etc.).
4. **MENSAJE OBLIGATORIO:** Al finalizar la introspección, el CLI DEBE imprimir en la consola un mensaje usando `chalk.yellow` o similar que diga exactamente: *"⚠️  Nota: Las tablas internas de Business Objects y Seguridad fueron ignoradas para evitar conflictos. Si deseas sincronizar los BO con la base de datos, utiliza el comando especializado: `pnpm run bo sync`"*.

### 🔴 FASE 5: Seeders de BOs y Seguridad
1. Configura el sistema de Seeders para asegurar que el registro genérico esté libre de fallas de duplicidad de Primary Keys.
2. Garantiza mediante SQL (`ON CONFLICT`) que los flujos de inserción de datos base no crasheen si se ejecutan dos veces.

# REGLAS DE ORO (Constraints)
- **NO ROMPER NADA EXISTENTE:** Migra la lógica actual de `scripts/db/schemas` al nuevo sistema de `/migrations` sin perder el concepto de negocio.
- **Transacciones:** Toda alteración a la BD debe usar `BEGIN` y `COMMIT`.
- **Estética:** El CLI debe verse increíble en la terminal. Usa emojis, colores y tablas (`cli-table3` para mostrar qué migraciones se aplicaron).
- **Documentación:** JSDoc/TypeDoc OBLIGATORIO en **ESPAÑOL** en todo código nuevo.

# FORMATO DE ENTREGA
Vas a ejecutar las fases una por una, probando cada una antes de pasar a la siguiente. No pases a la siguiente fase sin mi autorización explícita. Antes de terminar cada fase debes ejecutar `pnpm run verify` y corregir si hay tests fallidos. Luego de que pasen los tests, debes darme un mensaje de commit para yo poder hacer el commit. Al terminar la fase 5, se agregan 2 fases extras. Una es de testing, en la que vas a probar todos los comandos, todas sus posibilidades, vas a crear tests nuevos para lo nuevo implementado y vas a corregir si hay tests fallidos. La otra fase es de documentación, en la que vas a documentar todo lo nuevo implementado, vas a actualizar la documentación existente y vas a corregir si hay errores en la documentación en ambos idiomas (español e inglés).