# Sistema de Seguridad Unificado

La seguridad en ToProccess es el cimiento de la arquitectura.
Se basa en un modelo **Transaction-Oriented** donde cada acción de negocio tiene un ID único, permisos granulares y una ejecución orquestada de forma segura.

## 1. Concepto: Transaction-Oriented Security

En lugar de exponer recursos CRUD tradicionales (`POST /users`), exponemos Intenciones de Negocio (`tx: 1001` -> "Registrar Usuario").

**Ventajas**:

1.  **Desacoplamiento**: El frontend no sabe que existe una clase `UserBO`. Solo conoce el ID `1001`.
2.  **Auditoría**: Es trivial saber quién ejecutó la transacción `1001` y cuándo.
3.  **Refactorización**: Puedes renombrar métodos sin romper clientes.
4.  **Deny by Default**: Si una transacción no tiene permiso explícito en la DB, nadie la puede ejecutar.

---

## 2. Nueva Arquitectura (Core Refactor)

Hemos separado las responsabilidades en componentes especializados para cumplir con **SOLID** y mejorar la seguridad:

### A. Matriz de Permisos (`security.profile_method`)

Toda la autorización se basa en la base de datos, cargada en memoria RAM (`PermissionGuard`) para velocidad O(1).

| profile_id | object_name | method_name | descripcion          |
| :--------- | :---------- | :---------- | :------------------- |
| 2 (Public) | Auth        | register    | Permitido a anónimos |
| 1 (Admin)  | Admin       | dashboard   | Solo admins          |

**Esquema:**

```sql
security.profile_method (
    profile_method_id PK,
    profile_id FK -> profiles,
    method_id FK -> methods
)
```

### B. Componentes del Core (`src/core/*`)

1.  **SecurityService** (El Orquestador):
    - Coordina: Resolución -> Validación Ruta -> AuthZ -> Ejecución -> Auditoría.
    - Delega a componentes especializados.

2.  **PermissionGuard** (El Guardián):
    - Carga todos los permisos desde `security.profile_method` a un `Set<string>` en memoria.
    - Búsqueda O(1) mediante clave: `profile_id:object_name:method_name`.
    - **Seguridad Dinámica**: Métodos `grant()` y `revoke()` para actualizaciones en tiempo real.

3.  **TransactionExecutor** (El Ejecutor):
    - Carga dinámicamente el Business Object (BO).
    - **Seguridad Crítica**: Implementa **Path Containment**. Verifica que el archivo esté dentro de `/BO`.
    - Inyecta el contenedor IoC (`IContainer`).

4.  **TransactionMapper** (El Mapa):
    - Traduce `tx: 1001` -> `{ objectName: "Auth", methodName: "register" }`.

5.  **Integración Excel** (`PermissionMatrixReader` / `Writer`):
    - Permite la importación y exportación bidireccional masiva de la matriz de seguridad (9 hojas, desde Perfiles hasta Asignaciones de menú).
    - **Data Integrity**: La importación pasa estrictamente por el `IValidator` del framework usando schemas de Zod, garantizando consistencia y mensajes de error internacionalizados.

---

## 3. Gestión Dinámica de Permisos (Dual Write)

Los permisos pueden modificarse en tiempo de ejecución sin reiniciar el servidor.

### API:

```typescript
// Otorgar un permiso (escribe en DB + actualiza memoria)
await security.grantPermission(profileId, objectName, methodName)

// Revocar un permiso
await security.revokePermission(profileId, objectName, methodName)
```

### Cómo funciona:

1. **Escritura DB**: INSERT/DELETE en `security.profile_method`.
2. **Actualización Memoria**: Agregar/eliminar del Set<string> en caché.
3. **Efecto Inmediato**: La siguiente petición ve el cambio.

---

## 4. Flujo Seguro

1. **Resolución**: `TransactionMapper` encuentra la ruta.
2. **Validación de Ruta (Anti-Traversal)**: `SecurityService` verifica caracteres ilegales.
3. **Autorización**: `PermissionGuard.check()` verifica matriz de permisos.
4. **Ejecución Segura**: `TransactionExecutor` resuelve path absoluto, verifica contención y ejecuta.
5. **Auditoría**: Se registra éxito o error.

---

## 5. Perfiles Especiales

- **Perfil Público (ID Configurable)**:
    - Se usa automáticamente cuando un usuario no tiene sesión.
    - Define qué puede hacer un anónimo.
- **Super Admin (ID 1)**:
    - Típicamente tiene acceso a todo, pero el sistema lo trata como un perfil más.
    - No hay "if (admin) bypass" hardcodeado.

---

## 6. Capas Adicionales

1.  **CSRF (Cross-Site Request Forgery)**:
    - Token sincronizado en cookie y header.
2.  **Rate Limiting**:
    - Estrategias estrictas para endpoints sensibles (`/login`).

---

---

## 7. Gestión Dinámica de Menús y Estructura

El sistema ahora soporta una estructura de menús dinámica basada en base de datos con control de visibilidad granular por perfil.

### Concepto Core

- **Estructura Estricta**: La base de datos define _solo_ la jerarquía (Subsistemas -> Menús -> Opciones) y relaciones lógicas.
- **Sin Acoplamiento UI**: Campos como `icon`, `url`, `order` NO se guardan en la base de datos. El Frontend es responsable de mapear IDs/Nombres a componentes UI.
- **Asignación Granular**: La visibilidad se controla mediante tablas de asignación explícita (`profile_subsystem`, `profile_menu`).

### API de Gestión (Dual Write)

Operada vía `SecurityService`, que actualiza tanto la DB como la Memoria Caché instantáneamente.

```typescript
// Definir Estructura
await security.createSubsystem('Ventas')
await security.createMenu('Pedidos', subId)

// Asignar Visibilidad
await security.assignSubsystem(profileId, subId)
await security.assignMenu(profileId, menuId)
```

### Recuperación

`security.getMenuStructure(profileId)` retorna la estructura jerárquica filtrada por lo que ha sido explícitamente asignado a ese perfil.

---

## 8. Referencia del Esquema de Base de Datos

| Tabla                     | Descripción                                                            |
| :------------------------ | :--------------------------------------------------------------------- |
| `security.profiles`       | Roles de usuario (profile_id, profile_name)                            |
| `security.objects`        | Business Objects (object_id, object_name)                              |
| `security.methods`        | Métodos (method_id, method_name, object_id)                            |
| `security.transactions`   | Enlace entre tx_id y método (transaction_number, method_id, object_id) |
| `security.object_method`  | Relación N:M entre Objetos y Métodos (object_id, method_id)            |
| `security.profile_method` | Asignación de permisos (profile_id, method_id)                         |
| `security.user_profile`   | Asignación Usuario-Rol (user_id, profile_id)                           |
