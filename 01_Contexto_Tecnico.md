# 1. Stack Detectado y Dependencias a Instalar
- NodeJS, TypeScript, PostgreSQL.
- **Nuevas Dependencias CLI:** `@clack/prompts` (UI interactiva), `ora` (spinners), `chalk` (colores), `cli-table3` (para mostrar el estado de migraciones en consola).

# 2. Reglas de Estilo (Linter/Format)
- **Cero Acoplamiento en CLI:** Separar la Capa de UI (las preguntas interactivas) de la Capa de Lógica (la ejecución SQL).
- **Seguridad Transaccional:** Cada migración debe estar envuelta en `BEGIN;` y `COMMIT;`.
- **Manejo de Errores Visual:** Si una migración falla, el CLI debe mostrar un panel rojo con el error SQL exacto y confirmar que se hizo `ROLLBACK`.
- **Prevención de SQL Injection:** ESTRICTAMENTE PROHIBIDO usar template literals con input de usuario.

# 3. Definiciones de Datos y Estructuras
**Nueva Estructura de Carpetas:**
```text
/migrations
  ├── _history_table.ts     (Lógica para crear la tabla de tracking)
  ├── ddl/                  (Data Definition: CREATE, ALTER)
  │   └── 20260220_143000_crear_usuarios.ts
  ├── dml/                  (Data Manipulation: Seeders)
  │   └── 20260220_143500_seed_base_data.ts
  └── templates/            (Plantillas base para generar nuevos archivos)
```