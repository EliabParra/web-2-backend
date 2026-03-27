# Plantilla de Permisologia Dinamica

Esta plantilla cubre las dos capas necesarias para que el frontend funcione de forma dinamica por perfil:

1. Visibilidad de navegacion (subsystem, menu, option).
2. Ejecucion real de transacciones (object, method, object_method, profile_method, transaction).

## Nombres recomendados para que el frontend resuelva modulos

Usa estos nombres en menu_na y option_na para que DashboardLayout los mapee bien:

- Negocio: Solicitudes, Prestamos, Solvencia, Devoluciones, Inventario, Reportes, Notificar, Mantenimiento, Auditoria
- Negocio Admin: Prestamos Admin, Devoluciones Admin, Notificaciones Admin, Reportes Admin
- Seguridad: Usuarios, Perfil, Subsistema, Objetos, Metodos, Notificacion, Calendario

Nota: puedes usar acentos o variantes en ingles para varios casos, pero estos nombres son los mas estables para esta UI.

## SQL base (idempotente)

```sql
BEGIN;

-- =====================================================
-- 0) Parametros de trabajo (ajusta los perfiles)
-- =====================================================
WITH target_profiles AS (
    SELECT profile_id, profile_na
    FROM security.profile
    WHERE profile_na IN ('admin', 'docente', 'estudiante')
)
SELECT * FROM target_profiles;

-- =====================================================
-- 1) Subsystems
-- =====================================================
INSERT INTO security.subsystem (subsystem_na)
SELECT v.subsystem_na
FROM (VALUES ('Negocio'), ('Seguridad')) AS v(subsystem_na)
WHERE NOT EXISTS (
    SELECT 1 FROM security.subsystem s WHERE LOWER(s.subsystem_na) = LOWER(v.subsystem_na)
);

-- =====================================================
-- 2) Menus (usa nombres que el front reconoce)
-- =====================================================
WITH s AS (
    SELECT subsystem_id, subsystem_na FROM security.subsystem
)
INSERT INTO security.menu (menu_na, subsystem_id)
SELECT m.menu_na, s.subsystem_id
FROM (
    VALUES
    ('Solicitudes', 'Negocio'),
    ('Prestamos', 'Negocio'),
    ('Solvencia', 'Negocio'),
    ('Devoluciones', 'Negocio'),
    ('Inventario', 'Negocio'),
    ('Reportes', 'Negocio'),
    ('Notificar', 'Negocio'),
    ('Mantenimiento', 'Negocio'),
    ('Prestamos Admin', 'Negocio'),
    ('Devoluciones Admin', 'Negocio'),
    ('Notificaciones Admin', 'Negocio'),
    ('Reportes Admin', 'Negocio'),
    ('Usuarios', 'Seguridad'),
    ('Perfil', 'Seguridad'),
    ('Subsistema', 'Seguridad'),
    ('Objetos', 'Seguridad'),
    ('Metodos', 'Seguridad'),
    ('Notificacion', 'Seguridad'),
    ('Calendario', 'Seguridad')
) AS m(menu_na, subsystem_na)
JOIN s ON LOWER(s.subsystem_na) = LOWER(m.subsystem_na)
WHERE NOT EXISTS (
    SELECT 1
    FROM security.menu x
    WHERE LOWER(x.menu_na) = LOWER(m.menu_na)
      AND x.subsystem_id = s.subsystem_id
);

-- =====================================================
-- 3) Objetos y metodos (capa de autorizacion real)
-- =====================================================
INSERT INTO security.object (object_na)
SELECT v.object_na
FROM (VALUES
    ('Auth'),
    ('Devolution'),
    ('Notification'),
    ('Report'),
    ('User'),
    ('Profile'),
    ('Subsystem'),
    ('Object'),
    ('Method'),
    ('Menu'),
    ('Option')
) AS v(object_na)
WHERE NOT EXISTS (
    SELECT 1 FROM security.object o WHERE LOWER(o.object_na) = LOWER(v.object_na)
);

INSERT INTO security.method (method_na)
SELECT v.method_na
FROM (VALUES
    ('get'), ('getAll'), ('create'), ('update'), ('delete'),
    ('assignProfile'), ('revokeProfile'),
    ('assignSubsystem'), ('revokeSubsystem'),
    ('assignMenu'), ('revokeMenu'),
    ('assignOption'), ('revokeOption'),
    ('getNavigation'), ('switchActiveProfile')
) AS v(method_na)
WHERE NOT EXISTS (
    SELECT 1 FROM security.method m WHERE LOWER(m.method_na) = LOWER(v.method_na)
);

-- =====================================================
-- 4) Relacion object_method
-- =====================================================
WITH o AS (
    SELECT object_id, object_na FROM security.object
), m AS (
    SELECT method_id, method_na FROM security.method
)
INSERT INTO security.object_method (object_id, method_id)
SELECT o.object_id, m.method_id
FROM (
    VALUES
    ('Devolution','get'), ('Devolution','getAll'), ('Devolution','create'), ('Devolution','update'), ('Devolution','delete'),
    ('Notification','get'), ('Notification','getAll'), ('Notification','create'), ('Notification','update'), ('Notification','delete'),
    ('Report','get'), ('Report','getAll'), ('Report','create'), ('Report','update'), ('Report','delete'),
    ('User','get'), ('User','getAll'), ('User','create'), ('User','update'), ('User','delete'), ('User','assignProfile'), ('User','revokeProfile'),
    ('Profile','get'), ('Profile','getAll'), ('Profile','create'), ('Profile','update'), ('Profile','delete'),
    ('Profile','assignSubsystem'), ('Profile','revokeSubsystem'), ('Profile','assignMenu'), ('Profile','revokeMenu'), ('Profile','assignOption'), ('Profile','revokeOption'),
    ('Subsystem','get'), ('Subsystem','getAll'), ('Subsystem','create'), ('Subsystem','update'), ('Subsystem','delete'),
    ('Object','get'), ('Object','getAll'), ('Object','create'), ('Object','update'), ('Object','delete'),
    ('Method','get'), ('Method','getAll'), ('Method','create'), ('Method','update'), ('Method','delete'),
    ('Menu','get'), ('Menu','getAll'), ('Menu','create'), ('Menu','update'), ('Menu','delete'),
    ('Option','get'), ('Option','getAll'), ('Option','create'), ('Option','update'), ('Option','delete'),
    ('Auth','getNavigation'), ('Auth','switchActiveProfile')
) AS x(object_na, method_na)
JOIN o ON LOWER(o.object_na) = LOWER(x.object_na)
JOIN m ON LOWER(m.method_na) = LOWER(x.method_na)
WHERE NOT EXISTS (
    SELECT 1
    FROM security.object_method om
    WHERE om.object_id = o.object_id AND om.method_id = m.method_id
);

-- =====================================================
-- 5) Mapeo TX -> object/method
--    (usar los TX actuales del frontend)
-- =====================================================
WITH o AS (
    SELECT object_id, object_na FROM security.object
), m AS (
    SELECT method_id, method_na FROM security.method
)
INSERT INTO security.transaction (transaction_nu, object_id, method_id)
SELECT tx.transaction_nu, o.object_id, m.method_id
FROM (
    VALUES
    (8, 'Auth', 'getNavigation'),
    (9, 'Auth', 'switchActiveProfile'),

    (20, 'Devolution', 'get'),
    (21, 'Devolution', 'getAll'),
    (22, 'Devolution', 'create'),
    (23, 'Devolution', 'update'),
    (24, 'Devolution', 'delete'),

    (66, 'Notification', 'get'),
    (67, 'Notification', 'getAll'),
    (68, 'Notification', 'create'),
    (69, 'Notification', 'update'),
    (70, 'Notification', 'delete'),

    (99, 'Report', 'get'),
    (100, 'Report', 'getAll'),
    (101, 'Report', 'create'),
    (102, 'Report', 'update'),
    (103, 'Report', 'delete'),

    (109, 'User', 'get'),
    (110, 'User', 'getAll'),
    (111, 'User', 'create'),
    (112, 'User', 'update'),
    (113, 'User', 'delete'),
    (114, 'User', 'assignProfile'),
    (115, 'User', 'revokeProfile'),

    (81, 'Profile', 'get'),
    (82, 'Profile', 'getAll'),
    (83, 'Profile', 'create'),
    (84, 'Profile', 'update'),
    (85, 'Profile', 'delete'),
    (88, 'Profile', 'assignSubsystem'),
    (89, 'Profile', 'revokeSubsystem'),
    (90, 'Profile', 'assignMenu'),
    (91, 'Profile', 'revokeMenu'),
    (92, 'Profile', 'assignOption'),
    (93, 'Profile', 'revokeOption'),

    (104, 'Subsystem', 'get'),
    (105, 'Subsystem', 'getAll'),
    (106, 'Subsystem', 'create'),
    (107, 'Subsystem', 'update'),
    (108, 'Subsystem', 'delete'),

    (71, 'Object', 'get'),
    (72, 'Object', 'getAll'),
    (73, 'Object', 'create'),
    (74, 'Object', 'update'),
    (75, 'Object', 'delete'),

    (61, 'Method', 'get'),
    (62, 'Method', 'getAll'),
    (63, 'Method', 'create'),
    (64, 'Method', 'update'),
    (65, 'Method', 'delete'),

    (56, 'Menu', 'get'),
    (57, 'Menu', 'getAll'),
    (58, 'Menu', 'create'),
    (59, 'Menu', 'update'),
    (60, 'Menu', 'delete'),

    (76, 'Option', 'get'),
    (77, 'Option', 'getAll'),
    (78, 'Option', 'create'),
    (79, 'Option', 'update'),
    (80, 'Option', 'delete')
) AS tx(transaction_nu, object_na, method_na)
JOIN o ON LOWER(o.object_na) = LOWER(tx.object_na)
JOIN m ON LOWER(m.method_na) = LOWER(tx.method_na)
WHERE NOT EXISTS (
    SELECT 1 FROM security.transaction t WHERE t.transaction_nu = tx.transaction_nu
);

-- =====================================================
-- 6) Opciones (UI) y menu_option
--    Recomendado: una opcion por menu con el mismo nombre
-- =====================================================
INSERT INTO security.option (option_na)
SELECT menu_na
FROM security.menu m
WHERE NOT EXISTS (
    SELECT 1 FROM security.option o WHERE LOWER(o.option_na) = LOWER(m.menu_na)
);

INSERT INTO security.menu_option (menu_id, option_id)
SELECT m.menu_id, o.option_id
FROM security.menu m
JOIN security.option o ON LOWER(o.option_na) = LOWER(m.menu_na)
WHERE NOT EXISTS (
    SELECT 1 FROM security.menu_option mo WHERE mo.menu_id = m.menu_id AND mo.option_id = o.option_id
);

-- =====================================================
-- 7) Asignaciones por perfil (ejemplo para admin)
-- =====================================================
WITH p AS (
    SELECT profile_id FROM security.profile WHERE LOWER(profile_na) = LOWER('admin')
)
INSERT INTO security.profile_subsystem (profile_id, subsystem_id)
SELECT p.profile_id, s.subsystem_id
FROM p
JOIN security.subsystem s ON TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM security.profile_subsystem ps
    WHERE ps.profile_id = p.profile_id AND ps.subsystem_id = s.subsystem_id
);

WITH p AS (
    SELECT profile_id FROM security.profile WHERE LOWER(profile_na) = LOWER('admin')
)
INSERT INTO security.profile_menu (profile_id, menu_id)
SELECT p.profile_id, m.menu_id
FROM p
JOIN security.menu m ON TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM security.profile_menu pm
    WHERE pm.profile_id = p.profile_id AND pm.menu_id = m.menu_id
);

WITH p AS (
    SELECT profile_id FROM security.profile WHERE LOWER(profile_na) = LOWER('admin')
)
INSERT INTO security.profile_option (profile_id, option_id)
SELECT p.profile_id, o.option_id
FROM p
JOIN security.option o ON TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM security.profile_option po
    WHERE po.profile_id = p.profile_id AND po.option_id = o.option_id
);

-- =====================================================
-- 8) Permisos de ejecucion por perfil (admin completo)
-- =====================================================
WITH p AS (
    SELECT profile_id FROM security.profile WHERE LOWER(profile_na) = LOWER('admin')
)
INSERT INTO security.profile_method (profile_id, method_id)
SELECT p.profile_id, m.method_id
FROM p
JOIN security.method m ON TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM security.profile_method pm
    WHERE pm.profile_id = p.profile_id AND pm.method_id = m.method_id
);

COMMIT;
```

## Checklist rapido de validacion

- Login exitoso.
- Auth.getNavigation devuelve navigation con subsistemas, menus y opciones para el perfil.
- Sidebar cambia al cambiar perfil activo.
- Una opcion visible abre un modulo real del frontend.
- Una accion del modulo ejecuta TX sin error 403.

## Duda comun

Si ves botones pero al ejecutar da denegado:

- Falta perfil_method o transaction para ese object.method.

Si no ves botones pero la API funciona:

- Falta profile_subsystem, profile_menu o profile_option.
