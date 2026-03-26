BEGIN;

-- =====================================================
-- Plantilla en tablas (CTE VALUES) para menus/opciones
-- Ajustada a tus migraciones actuales:
--   Perfiles: public, session, super_admin, security_admin, supervisor
--   Subsistemas: Seguridad, Control de Inventario
--
-- Como usar:
-- 1) Edita SOLO las 4 tablas plantilla (template_*).
-- 2) Ejecuta el script completo.
-- 3) Es idempotente (NO duplica asignaciones).
-- =====================================================

WITH
-- -----------------------------------------------------
-- Tabla plantilla #1: catalogo de menus a crear/asegurar
-- columnas:
--   menu_na: nombre del menu en DB
--   subsystem_na: debe existir en security.subsystem
--   frontend_label: opcional, para hardcodearlo en front si quieres
-- -----------------------------------------------------
template_menu_catalog AS (
    SELECT *
    FROM (
        VALUES
            ('Prestamos',        'Control de Inventario', 'Prestamos'),
            ('Devoluciones',     'Control de Inventario', 'Devoluciones'),
            ('Inventario',       'Control de Inventario', 'Inventario'),
            ('Mantenimiento',    'Control de Inventario', 'Mantenimiento'),
            ('Reportes',         'Control de Inventario', 'Reportes'),
            ('Notificar',        'Control de Inventario', 'Notificar'),
            ('Solicitudes',      'Control de Inventario', 'Solicitudes'),

            ('Usuarios',         'Seguridad',             'Usuarios'),
            ('Perfil',           'Seguridad',             'Perfil'),
            ('Subsistema',       'Seguridad',             'Subsistema'),
            ('Objetos',          'Seguridad',             'Objetos'),
            ('Metodos',          'Seguridad',             'Metodos')
    ) AS t(menu_na, subsystem_na, frontend_label)
),

-- -----------------------------------------------------
-- Tabla plantilla #2: catalogo de opciones
-- Si option_na = menu_na, dejas navegacion 1:1 menu->opcion.
-- method_na_referencia se usa para resolver method_id.
-- -----------------------------------------------------
template_option_catalog AS (
    SELECT *
    FROM (
        VALUES
            ('Prestamos',        'getAll'),
            ('Devoluciones',     'getAll'),
            ('Inventario',       'getAll'),
            ('Mantenimiento',    'getAll'),
            ('Reportes',         'getAll'),
            ('Notificar',        'getAll'),
            ('Solicitudes',      'getAll'),

            ('Usuarios',         'getAll'),
            ('Perfil',           'getAll'),
            ('Subsistema',       'getAll'),
            ('Objetos',          'getAll'),
            ('Metodos',          'getAll')
    ) AS t(option_na, method_na_referencia)
),

-- -----------------------------------------------------
-- Tabla plantilla #3: relacion menu-opcion
-- (siempre en texto; el script resuelve IDs)
-- -----------------------------------------------------
template_menu_option_map AS (
    SELECT *
    FROM (
        VALUES
            ('Prestamos',        'Prestamos',        'Control de Inventario'),
            ('Devoluciones',     'Devoluciones',     'Control de Inventario'),
            ('Inventario',       'Inventario',       'Control de Inventario'),
            ('Mantenimiento',    'Mantenimiento',    'Control de Inventario'),
            ('Reportes',         'Reportes',         'Control de Inventario'),
            ('Notificar',        'Notificar',        'Control de Inventario'),
            ('Solicitudes',      'Solicitudes',      'Control de Inventario'),

            ('Usuarios',         'Usuarios',         'Seguridad'),
            ('Perfil',           'Perfil',           'Seguridad'),
            ('Subsistema',       'Subsistema',       'Seguridad'),
            ('Objetos',          'Objetos',          'Seguridad'),
            ('Metodos',          'Metodos',          'Seguridad')
    ) AS t(menu_na, option_na, subsystem_na)
),

-- -----------------------------------------------------
-- Tabla plantilla #4: matriz de asignacion por perfil
-- profile_na y subsystem_na deben existir en DB.
-- -----------------------------------------------------
template_profile_access AS (
    SELECT *
    FROM (
        VALUES
            -- super_admin
            ('super_admin',    'Seguridad',             'Usuarios',      'Usuarios'),
            ('super_admin',    'Seguridad',             'Perfil',        'Perfil'),
            ('super_admin',    'Seguridad',             'Subsistema',    'Subsistema'),
            ('super_admin',    'Seguridad',             'Objetos',       'Objetos'),
            ('super_admin',    'Seguridad',             'Metodos',       'Metodos'),
            ('super_admin',    'Control de Inventario', 'Prestamos',     'Prestamos'),
            ('super_admin',    'Control de Inventario', 'Devoluciones',  'Devoluciones'),
            ('super_admin',    'Control de Inventario', 'Inventario',    'Inventario'),
            ('super_admin',    'Control de Inventario', 'Mantenimiento', 'Mantenimiento'),
            ('super_admin',    'Control de Inventario', 'Reportes',      'Reportes'),
            ('super_admin',    'Control de Inventario', 'Notificar',     'Notificar'),
            ('super_admin',    'Control de Inventario', 'Solicitudes',   'Solicitudes'),

            -- security_admin
            ('security_admin', 'Seguridad',             'Usuarios',      'Usuarios'),
            ('security_admin', 'Seguridad',             'Perfil',        'Perfil'),
            ('security_admin', 'Seguridad',             'Subsistema',    'Subsistema'),
            ('security_admin', 'Seguridad',             'Objetos',       'Objetos'),
            ('security_admin', 'Seguridad',             'Metodos',       'Metodos')
    ) AS t(profile_na, subsystem_na, menu_na, option_na)
),

-- Resolucion de IDs (validacion implicita: si no existe nombre, no inserta)
menu_rows AS (
    SELECT
        tmc.menu_na,
        s.subsystem_id
    FROM template_menu_catalog tmc
    JOIN security.subsystem s ON s.subsystem_na = tmc.subsystem_na
),
option_rows AS (
    SELECT
        toc.option_na,
        m.method_id
    FROM template_option_catalog toc
    JOIN security.method m ON LOWER(m.method_na) = LOWER(toc.method_na_referencia)
),
menu_option_rows AS (
    SELECT
        m.menu_id,
        o.option_id
    FROM template_menu_option_map tmom
    JOIN security.subsystem s
      ON s.subsystem_na = tmom.subsystem_na
    JOIN security.menu m
      ON m.menu_na = tmom.menu_na
     AND m.subsystem_id = s.subsystem_id
    JOIN security.option o
      ON o.option_na = tmom.option_na
),
profile_access_rows AS (
    SELECT
        p.profile_id,
        s.subsystem_id,
        m.menu_id,
        o.option_id
    FROM template_profile_access tpa
    JOIN security.profile p
      ON p.profile_na = tpa.profile_na
    JOIN security.subsystem s
      ON s.subsystem_na = tpa.subsystem_na
    JOIN security.menu m
      ON m.menu_na = tpa.menu_na
     AND m.subsystem_id = s.subsystem_id
    JOIN security.option o
      ON o.option_na = tpa.option_na
),

insert_menu AS (
    INSERT INTO security.menu (menu_na, subsystem_id)
    SELECT DISTINCT mr.menu_na, mr.subsystem_id
    FROM menu_rows mr
    WHERE NOT EXISTS (
        SELECT 1
        FROM security.menu m
        WHERE m.menu_na = mr.menu_na
          AND m.subsystem_id = mr.subsystem_id
    )
    RETURNING menu_id
),
insert_option AS (
    INSERT INTO security.option (option_na, method_id)
    SELECT DISTINCT orw.option_na, orw.method_id
    FROM option_rows orw
    WHERE NOT EXISTS (
        SELECT 1
        FROM security.option o
        WHERE o.option_na = orw.option_na
    )
    RETURNING option_id
),
insert_menu_option AS (
    INSERT INTO security.menu_option (menu_id, option_id)
    SELECT DISTINCT mor.menu_id, mor.option_id
    FROM menu_option_rows mor
    WHERE NOT EXISTS (
        SELECT 1
        FROM security.menu_option mo
        WHERE mo.menu_id = mor.menu_id
          AND mo.option_id = mor.option_id
    )
    RETURNING menu_id
),
insert_profile_menu AS (
    INSERT INTO security.profile_menu (profile_id, menu_id)
    SELECT DISTINCT par.profile_id, par.menu_id
    FROM profile_access_rows par
    WHERE NOT EXISTS (
        SELECT 1
        FROM security.profile_menu pm
        WHERE pm.profile_id = par.profile_id
          AND pm.menu_id = par.menu_id
    )
    RETURNING profile_id
),
insert_profile_option AS (
    INSERT INTO security.profile_option (profile_id, option_id)
    SELECT DISTINCT par.profile_id, par.option_id
    FROM profile_access_rows par
    WHERE NOT EXISTS (
        SELECT 1
        FROM security.profile_option po
        WHERE po.profile_id = par.profile_id
          AND po.option_id = par.option_id
    )
    RETURNING profile_id
),
insert_profile_subsystem AS (
    INSERT INTO security.profile_subsystem (profile_id, subsystem_id)
    SELECT DISTINCT par.profile_id, par.subsystem_id
    FROM profile_access_rows par
    WHERE NOT EXISTS (
        SELECT 1
        FROM security.profile_subsystem ps
        WHERE ps.profile_id = par.profile_id
          AND ps.subsystem_id = par.subsystem_id
    )
    RETURNING profile_id
)

SELECT
    (SELECT COUNT(*) FROM insert_menu) AS menus_creados,
    (SELECT COUNT(*) FROM insert_option) AS opciones_creadas,
    (SELECT COUNT(*) FROM insert_menu_option) AS menu_option_creados,
    (SELECT COUNT(*) FROM insert_profile_menu) AS profile_menu_creados,
    (SELECT COUNT(*) FROM insert_profile_option) AS profile_option_creados,
    (SELECT COUNT(*) FROM insert_profile_subsystem) AS profile_subsystem_creados;

COMMIT;

-- Verificacion rapida
-- SELECT profile_na, COUNT(*) FROM security.profile_menu pm JOIN security.profile p USING(profile_id) GROUP BY profile_na ORDER BY profile_na;
-- SELECT profile_na, COUNT(*) FROM security.profile_option po JOIN security.profile p USING(profile_id) GROUP BY profile_na ORDER BY profile_na;
-- SELECT profile_na, COUNT(*) FROM security.profile_subsystem ps JOIN security.profile p USING(profile_id) GROUP BY profile_na ORDER BY profile_na;
