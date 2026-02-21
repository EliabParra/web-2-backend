# 1. Objetivo del Sprint
Transformar la DX del proyecto implementando una inicialización en un solo paso (`Zero-to-Hero`), refactorizar la orquestación de Docker, solventar bloqueos de red (CORS/CSRF) en entornos locales, y construir un CLI de Base de Datos de nivel empresarial con TUI (Terminal UI), introspección de esquemas y migraciones seguras.

# 2. Análisis Crítico y Respuestas Arquitectónicas
### A. El Dilema de las Migraciones: ¿Resetear o Sobre-escribir?
Respondiendo a tu duda arquitectónica: **Tener un comando de Reset es obligatorio en Desarrollo, pero prohibido en Producción.**
Cuando trabajas en equipo y alguien altera la BD, hacer merge de sus migraciones sobre tu BD sucia causa conflictos. La solución estándar en la industria es tener dos flujos:
1. `db:migrate`: Aplica migraciones nuevas secuencialmente (seguro para Producción).
2. `db:reset`: Destruye el esquema `public`, lo recrea limpio, corre TODAS las migraciones desde cero y ejecuta los seeders (Ideal para Desarrollo cuando traes cambios de git).

### B. Introspección (De BD Manual a Código) y Aislamiento de Dominios
El CLI tendrá un comando `db:introspect`. Sin embargo, para mantener una separación de responsabilidades estricta, la introspección ignorará por completo las tablas que pertenecen al dominio de los Business Objects (BOs), ya que existe un CLI especializado (`bo sync`) para gestionarlos.

### C. El Fallo de CSRF/CORS en Otra Máquina
El error de WebSockets y CSRF en otra máquina ocurre porque los navegadores y middlewares de seguridad evalúan el `Origin` o `Host`. Si en tu máquina es `localhost`, pero en otra es `192.168.1.5`, el middleware lo detecta como un ataque y bloquea el handshake del WebSocket. La estrategia será hacer que el CORS y CSRF confíen dinámicamente en IPs de la subred local durante el desarrollo.

# 3. Plan de Arquitectura (Comandos Mágicos)
Se creará un flujo de comandos unificado en el `package.json`:
- `npm run dx:init`: Levanta Docker, instala módulos, espera a la BD, hace reset y siembra datos. (Listo en 5 mins).

**Arquitectura del CLI (`npm run db` / `pnpm run db`):**
- UI impulsada por `@clack/prompts` (menús con flechas, spinners).
- Ubicación: `/migrations` en la raíz (separado en `/migrations/ddl` para esquemas y `/migrations/dml` para datos/seeders).
- Gestión de BOs: Mantener el flujo aislado para la inyección de BOs y Métodos.