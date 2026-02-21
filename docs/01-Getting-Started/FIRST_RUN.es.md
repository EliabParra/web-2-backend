# Primera Ejecución Detallada (Deep Dive into First Run)

Ya instalaste todo y configuraste el entorno. Ahora vamos a ver qué pasa cuando "aprietas el botón de encendido".

## 1. Inicialización de Base de Datos (`pnpm run dx:init`)

Este comando es crítico para la primera vez.

### ¿Qué hace exactamente?

1.  **Docker Orchestration**: Levanta el contenedor de PostgreSQL y la interfaz web Adminer a través de `docker-compose`.
2.  **Verificación Health**: Espera a que la base de datos esté "Healthy" y lista para aceptar conexiones TCP.
3.  **Ejecución DB CLI**: Dispara el comando interno de inicialización segura invocando `pnpm run db:init` o ejecutando el `MigrationRunner`.
    - `01_base.ts`: Crea tablas base del sistema (`security`)
    - `89_schema_security_audit.ts`: Crea la tabla `audit_log`.
4.  **Generadores**: Crea archivos dinámicos si es necesario (e.g. documentación automática de base de datos) interactuando con `/migrations`.

### Uso

```bash
pnpm run dx:init
```

**Salida Esperada:**

```text
✅ Connected to DB
🚀 DB Init Complete
```

> **Nota**: Si falla, revisa tu `PGPASSWORD` en el archivo `.env`. El 99% de los errores son credenciales incorrectas.

---

## 2. Modo Desarrollo (`pnpm run dev`)

Este es el comando que usarás el 90% del tiempo.

### Características Mágicas

- **Hot Reload (Nodemon)**: No necesitas detener y reiniciar el server. Si editas un archivo y guardas (`Ctrl+S`), el servidor se reinicia solo en menos de 1 segundo.
- **TypeScript on-the-fly (`tsx`)**: Ejecuta el código `.ts` directamente sin compilar a disco. Es muy rápido.
- **Watch Mode**: Vigila carpetas clave (`src`, `BO`, `public`).

### Uso

```bash
pnpm run dev
```

**Verificación**:
Abre `http://localhost:3000/health`. Deberías ver: `OK`.

---

## 3. Modo Producción (`pnpm run build` + `pnpm start`)

Así es como debe correr en AWS, DigitalOcean o tu servidor real. Nunca uses `pnpm run dev` en producción (es lento e inseguro).

### Paso A: Compilación (`pnpm run build`)

Transforma tu código TypeScript (bonito pero pesado) a JavaScript estándar (feo pero rapidísimo).

- **Entrada**: carpeta `src/`, `BO/`.
- **Salida**: carpeta `dist/`.

> **¿Por qué compilar?**
> Node.js no entiende TypeScript nativamente. La compilación elimina tipos y optimiza el código.

### Paso B: Ejecución (`pnpm start`)

Corre el código optimizado desde la carpeta `dist/`.

```bash
pnpm start
```

---

## Resumen del Ciclo de Vida

1.  **Instalar** (`pnpm install`)
2.  **Configurar** (`.env`)
3.  **Inicializar DB** (`pnpm run db:init`)
4.  **Programar** (`pnpm run dev`)
5.  **Desplegar** (`pnpm run build` -> `pnpm start`)

## Siguiente Paso

Ya sabes correrlo. Ahora aprende a usar las herramientas de poder en [CLI Tools](CLI_TOOLS.es.md).
