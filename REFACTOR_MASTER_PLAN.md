# PROTOCOLO MAESTRO DE REFACTORIZACIÓN: MIGRACIÓN ESTRUCTURAL Y SEGURIDAD DINÁMICA

**Rol:** Arquitecto de Software Senior & Lead Developer (TypeScript/Node.js).
**Modo de Operación:** Crítico, Quirúrgico y Detallado.
**Idioma de Salida:** Razonamiento y Explicación en **ESPAÑOL**. Código en **INGLÉS**.
**Skills Requeridas:** `clean-code`, `solid`, `typescript-advanced-types`.

---

## 1. CONTEXTO Y OBJETIVO CRÍTICO

El sistema actual opera sobre un esquema de base de datos "Legacy". Vamos a realizar una cirugía mayor al núcleo del framework.
**El objetivo es migrar a un Esquema Relacional Estricto (definido abajo) y refactorizar todo el código TypeScript para que el sistema siga funcionando.**

**⚠️ ALERTA DE RIESGO:**
Al cambiar los nombres de las tablas y columnas (especialmente en la tabla `users`), el código existente (`AuthBO`, `SessionService`, `User Types`) **SE ROMPERÁ**. Tu prioridad absoluta en la FASE 1 es realizar una refactorización tipo "Buscar y Reemplazar Inteligente" para curar estas roturas antes de avanzar a nuevas funcionalidades.

---

## 2. ESQUEMA DE BASE DE DATOS OBLIGATORIO (FUENTE DE VERDAD)

Debes implementar este modelo ER exacto. No puedes cambiar nombres, ni tipos, ni relaciones.
**Regla de Naming Inquebrantable:** Todos los campos deben seguir el formato `{nombre_tabla_singular}_{nombre_campo}`.

### 2.1 Esquema SECURITY (Core Framework)

Este esquema gestiona el acceso.

1.  **`subsystems`**
    - `subsystem_id` (PK, Auto-inc)
    - `subsystem_name` (Unique)
2.  **`objects`** (Representa entidades o recursos abstractos)
    - `object_id` (PK)
    - `object_name`
3.  **`subsystem_object`** (Relación SS-Obj)
    - `subsystem_object_id` (PK)
    - `object_id` (FK -> objects)
    - `subsystem_id` (FK -> subsystems)
4.  **`methods`** (Acciones realizables)
    - `method_id` (PK)
    - `method_name`
5.  **`object_method`** (Métodos disponibles por objeto)
    - `object_method_id` (PK)
    - `object_id` (FK)
    - `method_id` (FK)
6.  **`transactions`** (Definición de transacciones del sistema)
    - `transaction_id` (PK)
    - `transaction_number`
    - `method_id` (FK)
    - `object_id` (FK)
    - `subsystem_id` (FK)
7.  **`menus`** (Contenedores visuales)
    - `menu_id` (PK)
    - `menu_name`
    - `subsystem_id` (FK)
8.  **`options`** (Items de menú o acciones de UI)
    - `option_id` (PK)
    - `option_name`
9.  **`menu_option`**
    - `menu_option_id` (PK)
    - `menu_id` (FK)
    - `option_id` (FK)
10. **`profiles`** (Roles)
    - `profile_id` (PK)
    - `profile_name`
11. **`profile_option`** (Permisos de UI)
    - `profile_option_id` (PK)
    - `profile_id` (FK)
    - `option_id` (FK)
12. **`profile_method`** (Permisos de Backend/API)
    - `profile_method_id` (PK)
    - `profile_id` (FK)
    - `method_id` (FK)
13. **`users`** (**MODIFICACIÓN DE TABLA EXISTENTE**)
    - _Nota:_ Esta tabla YA EXISTE. Debes crear una migración para **RENOMBRAR** sus columnas y agregar las nuevas. NO LA BORRES.
    - `user_id` (PK) <-- Antes era `id`
    - `user_email` <-- Antes era `email`
    - `user_password` <-- Antes era `password`
    - `user_solvent` (Boolean, Nuevo)
    - `person_id` (FK -> persons, Nuevo)
    - _Mantener compatibilidad renombrando:_
        - `created_at` -> `user_created_at`
        - `updated_at` -> `user_updated_at`
        - `is_active` -> `user_is_active` (si existe)
        - `email_verified_at` -> `user_email_verified_at`
14. **`user_profile`** (Asignación de roles)
    - `user_profile_id` (PK)
    - `user_id` (FK -> users)
    - `profile_id` (FK -> profiles)

### 2.2 Esquema BUSINESS (Datos del Negocio)

1.  **`persons`**
    - `person_id` (PK)
    - `person_ci` (Cédula/ID Nacional)
    - `person_name`
    - `person_lastname`
    - `person_phone`
    - `person_degree`
2.  **`groups`**
    - `group_id` (PK)
    - `group_name`
3.  **`group_person`**
    - `group_person_id` (PK)
    - `group_id` (FK)
    - `person_id` (FK)

### 2.3 Tablas Legacy (INTACTAS)

Las siguientes tablas NO deben ser tocadas ni eliminadas:

- `audit_log`
- `one_time_codes`
- `password_resets`
- `sessions`

---

## 3. CONTEXTO DE ARCHIVOS (OBLIGATORIO LEER)

Para ejecutar esto, debes leer y entender el estado actual de:

1.  `scripts/db/schemas/*.ts` (Para ver la definición actual de `users`).
2.  `src/services/DatabaseService.ts` (Motor de BD).
3.  `BO/Auth/*` (Especialmente `AuthBO.ts`, `AuthService.ts`, `AuthRepository.ts` - Aquí es donde explotará el cambio de nombres).
4.  `src/types/index.ts` y `src/types/core.ts` (Interfaces de User/Session).
5.  `src/services/SecurityService.ts` (El servicio que refactorizarás en Fase 2).

---

## 4. PLAN DE EJECUCIÓN POR FASES

Debes seguir este orden estrictamente. No avances de fase hasta completar la anterior.

### FASE 1: Migración de BD y Reparación del Core (PRIORIDAD MÁXIMA)

El objetivo es que el backend compile y arranque usando el nuevo esquema.

1.  **Script de Migración:** Genera un script de migración que:
    - Cree todas las tablas nuevas (`subsystems`, `objects`, `persons`, etc.).
    - Ejecute `ALTER TABLE users` para renombrar las columnas (`RENAME COLUMN email TO user_email`).
2.  **Refactorización de Tipos:**
    - Ve a `src/types/` y modifica la interfaz `User` (o equivalente) para que coincida con la BD (`user_id`, `user_email`...).
3.  **Búsqueda y Reemplazo (Reparación):**
    - Analiza `BO/Auth`, `SessionService`, `AuthCheck Middleware`.
    - Cambia todas las referencias de `user.id` a `user.user_id`.
    - Cambia todas las referencias de `user.email` a `user.user_email`.
    - Asegúrate de que los queries SQL/ORM en `AuthRepository` usen los nuevos nombres de columna.

### FASE 2: Seguridad Dinámica y "Dual Write"

Una vez el sistema sea estable, implementa la lógica de permisos en `SecurityService`.

1.  **Carga en Memoria:** Al iniciar (`init()`), carga `profile_method` y `profile_option` en un `Map<ProfileId, Set<Id>>`.
2.  **Sincronización Atómica (Dual Write):**
    - Crea métodos como `grantPermission(profileId, methodId)`.
    - **Lógica:**
        1.  Inicia transacción BD.
        2.  Inserta en `profile_method`.
        3.  Commit transacción.
        4.  **Inmediatamente** actualiza el `Map` en memoria.
    - _Resultado:_ El cambio de permiso es efectivo en el siguiente request sin reiniciar el servidor.
3.  **Exposición:** Asegura que estos métodos sean accesibles para ser llamados por futuros Business Objects.

### FASE 3: QA, Tests y Documentación ✅ COMPLETADO

1.  **Tests:** ✅ Todos los tests reparados (144 pasando).
2.  **Docs:** ✅ Documentación actualizada (SECURITY_SYSTEM, AUTH_MODULE, DATABASE_LAYER, README).

---

## 5. ESTADO DE COMPLETACIÓN

> **✅ TODAS LAS FASES COMPLETADAS** (2026-02-07)

| Fase                                   | Estado | Detalles                                      |
| -------------------------------------- | ------ | --------------------------------------------- |
| **Fase 1**: DB Migration + Core Repair | ✅     | Schema migrado, Auth/Session refactorizados   |
| **Fase 2**: Seguridad Dinámica         | ✅     | `PermissionGuard` con Dual Write implementado |
| **Fase 3**: QA + Docs                  | ✅     | 144 tests, documentación sincronizada         |

### Archivos Modificados (Resumen)

- **Migraciones**: `50_refactor_phase1.ts`
- **Auth/Session**: `AuthQueries.ts`, `AuthTypes.ts`, `SessionService.ts`
- **Security Core**: `SecurityService.ts`, `PermissionGuard.ts`, `SecurityQueries.ts`
- **Seeders**: `admin.ts`, `profiles.ts`, `bo-registrar.ts`
- **Tests**: 10+ archivos actualizados para nuevo schema
