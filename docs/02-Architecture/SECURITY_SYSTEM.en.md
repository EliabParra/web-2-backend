# Unified Security System

Security in ToProccess is the foundation of the architecture.
It is based on a **Transaction-Oriented** model where every business action has a unique ID, granular permissions, and securely orchestrated execution.

## 1. Concept: Transaction-Oriented Security

Instead of exposing traditional CRUD resources (`POST /users`), we expose Business Intentions (`tx: 1001` -> "Register User").

**Advantages**:

1.  **Decoupling**: The frontend doesn't know `UserBO` exists. It only knows ID `1001`.
2.  **Audit**: Trivial to track who executed transaction `1001` and when.
3.  **Refactoring**: You can rename methods without breaking clients.
4.  **Deny by Default**: If a transaction doesn't have explicit permission in the DB, no one can execute it.

---

## 2. New Architecture (Core Refactor)

We have separated responsibilities into specialized components to comply with **SOLID** and enhance security:

### A. Permission Matrix (`security.profile_method`)

Authorization is based on the database, loaded into RAM (`PermissionGuard`) for O(1) speed.

| profile_id | object_name | method_name | description        |
| :--------- | :---------- | :---------- | :----------------- |
| 2 (Public) | Auth        | register    | Allowed for guests |
| 1 (Admin)  | Admin       | dashboard   | Admins only        |

**Schema:**

```sql
security.profile_method (
    profile_method_id PK,
    profile_id FK -> profiles,
    method_id FK -> methods
)
```

### B. Core Components (`src/core/*`)

1.  **SecurityService** (The Orchestrator):
    - Coordinates: Resolution -> Route Validation -> AuthZ -> Execution -> Audit.
    - Delegates to specialized components.

2.  **PermissionGuard** (The Guardian):
    - Loads all permissions from `security.profile_method` into an in-memory `Set<string>`.
    - O(1) permission checks via key format: `profile_id:object_name:method_name`.
    - **Dynamic Security**: `grant()` and `revoke()` methods for real-time updates.

3.  **TransactionExecutor** (The Executor):
    - Dynamically loads the Business Object (BO).
    - **Critical Security**: Implements **Path Containment**. Verifies the file to load is strictly within `/BO`.
    - Injects dependencies (DB, Log, Validator, I18n).

4.  **TransactionMapper** (The Map):
    - Translates `tx: 1001` -> `{ objectName: "Auth", methodName: "register" }`.

---

## 3. Dynamic Permission Management (Dual Write)

Permissions can be modified at runtime without server restart.

### API:

```typescript
// Grant a permission (writes to DB + updates memory)
await security.grantPermission(profileId, objectName, methodName)

// Revoke a permission
await security.revokePermission(profileId, objectName, methodName)
```

### How it works:

1. **DB Write**: INSERT/DELETE in `security.profile_method`.
2. **Memory Update**: Add/remove from `Set<string>` cache.
3. **Immediate Effect**: Next request sees the change.

---

## 4. Secure Flow

1. **Resolution**: `TransactionMapper` finds the route.
2. **Route Validation (Anti-Traversal)**: `SecurityService` checks for illegal characters.
3. **Authorization**: `PermissionGuard.check()` verifies permission matrix.
4. **Secure Execution**: `TransactionExecutor` resolves absolute path, ensures root containment, and executes.
5. **Audit**: Success or error is logged.

---

## 5. Special Profiles

- **Public Profile (Configurable ID)**:
    - Automatically used when a user has no session.
    - Defines what an anonymous user can do.
- **Super Admin (ID 1)**:
    - Typically has access to everything, but handled as just another profile.
    - No hardcoded "if (admin) bypass".

---

## 6. Additional Layers

1.  **CSRF (Cross-Site Request Forgery)**:
    - Synchronized token in cookie and header.
2.  **Rate Limiting**:
    - Strict strategies for sensitive endpoints (`/login`).

---

## 7. Database Schema Reference

| Table                     | Description                                    |
| :------------------------ | :--------------------------------------------- |
| `security.profiles`       | User roles (profile_id, profile_name)          |
| `security.objects`        | Business Objects (object_id, object_name)      |
| `security.methods`        | Methods (method_id, method_name, object_id)    |
| `security.profile_method` | Permission assignments (profile_id, method_id) |
| `security.user_profile`   | User-to-Role assignments (user_id, profile_id) |
