/**
 * Queries SQL parametrizadas para el módulo Excel de seguridad.
 * Todas las consultas usan parámetros posicionales ($1, $2...) para prevenir inyección SQL.
 *
 * TODO(REVERT_NAMING): Revert all column names: profile_na→profile_na, user_na→username, user_pw→user_user_pw,
 * object_na→object_na, method_na→method_na, menu_na→menu_na, option_na→option_name, transaction_nu→transaction_number
 *
 * @module security/excel
 */
export const ExcelQueries = {
    // ═══════════════════════════════════════════════════════════════════
    // EXPORT — Consultas de lectura para exportación
    // ═══════════════════════════════════════════════════════════════════

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    SELECT_PROFILES: 'SELECT profile_na FROM security.profile ORDER BY profile_id',

    SELECT_USERS: `
        SELECT u.user_na, '' as user_pw, p.profile_na
        FROM security."user" u
        LEFT JOIN security.user_profile up ON u.user_id = up.user_id
        LEFT JOIN security.profile p ON up.profile_id = p.profile_id
        ORDER BY u.user_id`,

    SELECT_SUBSYSTEMS: 'SELECT subsystem_na FROM security.subsystem ORDER BY subsystem_id',

    SELECT_OBJECTS: 'SELECT object_na FROM security.object ORDER BY object_id',

    SELECT_METHODS_EXPORT: `
        SELECT obj.object_na, met.method_na
        FROM security.object_method om
        INNER JOIN security.object obj ON om.object_id = obj.object_id
        INNER JOIN security.method met ON om.method_id = met.method_id
        ORDER BY obj.object_na, met.method_na`,

    SELECT_MENUS: `
        SELECT m.menu_na, s.subsystem_na
        FROM security.menu m
        INNER JOIN security.subsystem s ON m.subsystem_id = s.subsystem_id
        ORDER BY m.menu_id`,

    SELECT_OPTIONS: `
        SELECT o.option_na,
               COALESCE(obj.object_na || '.' || met.method_na, '') as object_method,
               COALESCE(m.menu_na, '') as menu_na
        FROM security.option o
        LEFT JOIN security.method met ON o.method_id = met.method_id
        LEFT JOIN security.object_method om ON met.method_id = om.method_id
        LEFT JOIN security.object obj ON om.object_id = obj.object_id
        LEFT JOIN security.menu_option mo ON o.option_id = mo.option_id
        LEFT JOIN security.menu m ON mo.menu_id = m.menu_id
        ORDER BY o.option_id`,

    SELECT_PERMISSIONS: `
        SELECT p.profile_na, obj.object_na || '.' || met.method_na as object_method
        FROM security.profile_method pm
        INNER JOIN security.profile p ON pm.profile_id = p.profile_id
        INNER JOIN security.method met ON pm.method_id = met.method_id
        INNER JOIN security.object_method om ON met.method_id = om.method_id
        INNER JOIN security.object obj ON om.object_id = obj.object_id
        ORDER BY p.profile_na, obj.object_na, met.method_na`,

    SELECT_ASSIGNMENTS: `
        SELECT p.profile_na, s.subsystem_na,
               COALESCE(m.menu_na, '') as menu_na,
               COALESCE(o.option_na, '') as option_na
        FROM security.profile_subsystem ps
        INNER JOIN security.profile p ON ps.profile_id = p.profile_id
        INNER JOIN security.subsystem s ON ps.subsystem_id = s.subsystem_id
        LEFT JOIN security.profile_menu pm ON ps.profile_id = pm.profile_id
        LEFT JOIN security.menu m ON pm.menu_id = m.menu_id AND m.subsystem_id = s.subsystem_id
        LEFT JOIN security.profile_option po ON ps.profile_id = po.profile_id
        LEFT JOIN security.menu_option mo ON po.option_id = mo.option_id AND mo.menu_id = m.menu_id
        LEFT JOIN security.option o ON po.option_id = o.option_id
        ORDER BY p.profile_na, s.subsystem_na`,

    SELECT_OBJECT_METHODS: `
        SELECT obj.object_na || '.' || met.method_na as object_method
        FROM security.object_method om
        INNER JOIN security.object obj ON om.object_id = obj.object_id
        INNER JOIN security.method met ON om.method_id = met.method_id
        ORDER BY obj.object_na, met.method_na`,

    SELECT_MENU_NAMES: 'SELECT menu_na FROM security.menu ORDER BY menu_na',

    // ═══════════════════════════════════════════════════════════════════
    // IMPORT — Inserciones parametrizadas
    // ═══════════════════════════════════════════════════════════════════

    INSERT_PROFILE: `
        INSERT INTO security.profile (profile_na)
        SELECT $1
        WHERE NOT EXISTS (
            SELECT 1 FROM security.profile WHERE profile_na = $1
        )
        RETURNING profile_id`,

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    INSERT_USER: `
        INSERT INTO security."user" (user_na, user_pw)
        SELECT $1, $2
        WHERE NOT EXISTS (
            SELECT 1 FROM security."user" WHERE user_na = $1
        )
        RETURNING user_id`,

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    INSERT_USER_PROFILE: `
        INSERT INTO security.user_profile (user_id, profile_id, assigned_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, profile_id) DO NOTHING`,

    INSERT_SUBSYSTEM: `
        INSERT INTO security.subsystem (subsystem_na)
        SELECT $1
        WHERE NOT EXISTS (
            SELECT 1 FROM security.subsystem WHERE subsystem_na = $1
        )
        RETURNING subsystem_id`,

    INSERT_OBJECT: `
        INSERT INTO security.object (object_na)
        SELECT $1
        WHERE NOT EXISTS (
            SELECT 1 FROM security.object WHERE object_na = $1
        )
        RETURNING object_id`,

    INSERT_METHOD: `
        INSERT INTO security.method (method_na)
        SELECT $1
        WHERE NOT EXISTS (
            SELECT 1 FROM security.method WHERE method_na = $1
        )
        RETURNING method_id`,

    INSERT_OBJECT_METHOD: `
        INSERT INTO security.object_method (object_id, method_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING`,

    INSERT_TRANSACTION: `
        INSERT INTO security.transaction (transaction_nu, method_id, object_id)
        VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,

    SELECT_NEXT_TX: `
        SELECT COALESCE(MAX(transaction_nu::integer), 0) + 1 AS next_tx
        FROM security.transaction`,

    INSERT_MENU: `
        INSERT INTO security.menu (menu_na, subsystem_id)
        SELECT $1, $2
        WHERE NOT EXISTS (
            SELECT 1 FROM security.menu WHERE menu_na = $1 AND subsystem_id = $2
        )
        RETURNING menu_id`,

    INSERT_OPTION: `
        INSERT INTO security.option (option_na, method_id)
        SELECT $1, $2
        WHERE NOT EXISTS (
            SELECT 1 FROM security.option WHERE option_na = $1
        )
        RETURNING option_id`,

    INSERT_MENU_OPTION: `
        INSERT INTO security.menu_option (menu_id, option_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING`,

    INSERT_PERMISSION: `
        INSERT INTO security.profile_method (profile_id, method_id)
        SELECT p.profile_id, met.method_id
        FROM security.profile p, security.method met
        INNER JOIN security.object_method om ON met.method_id = om.method_id
        INNER JOIN security.object obj ON om.object_id = obj.object_id
        WHERE p.profile_na = $1 AND obj.object_na = $2 AND met.method_na = $3
        ON CONFLICT DO NOTHING
        RETURNING profile_method_id`,

    INSERT_PERMISSION_BY_IDS: `
        INSERT INTO security.profile_method (profile_id, method_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        RETURNING profile_method_id`,

    INSERT_PROFILE_SUBSYSTEM: `
        INSERT INTO security.profile_subsystem (profile_id, subsystem_id)
        SELECT p.profile_id, s.subsystem_id
        FROM security.profile p, security.subsystem s
        WHERE p.profile_na = $1 AND s.subsystem_na = $2
        ON CONFLICT DO NOTHING`,

    INSERT_PROFILE_MENU: `
        INSERT INTO security.profile_menu (profile_id, menu_id)
        SELECT p.profile_id, m.menu_id
        FROM security.profile p, security.menu m
        INNER JOIN security.subsystem s ON m.subsystem_id = s.subsystem_id
        WHERE p.profile_na = $1 AND m.menu_na = $2 AND s.subsystem_na = $3
        ON CONFLICT DO NOTHING`,

    INSERT_PROFILE_OPTION: `
        INSERT INTO security.profile_option (profile_id, option_id)
        SELECT p.profile_id, o.option_id
        FROM security.profile p, security.option o
        WHERE p.profile_na = $1 AND o.option_na = $2
        ON CONFLICT DO NOTHING`,

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP — Resolución de FKs por nombre
    // ═══════════════════════════════════════════════════════════════════

    FIND_PROFILE_BY_NAME: 'SELECT profile_id FROM security.profile WHERE profile_na = $1',
    FIND_SUBSYSTEM_BY_NAME: 'SELECT subsystem_id FROM security.subsystem WHERE subsystem_na = $1',
    FIND_MENU_BY_NAME: 'SELECT menu_id FROM security.menu WHERE menu_na = $1',
    FIND_MENU_BY_NAME_AND_SUBSYSTEM:
        'SELECT menu_id FROM security.menu WHERE menu_na = $1 AND subsystem_id = $2',

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    FIND_USER_BY_NAME: 'SELECT user_id FROM security."user" WHERE user_na = $1',

    FIND_METHOD_BY_OBJECT_METHOD: `
        SELECT met.method_id
        FROM security.method met
        INNER JOIN security.object_method om ON met.method_id = om.method_id
        INNER JOIN security.object obj ON om.object_id = obj.object_id
        WHERE obj.object_na = $1 AND met.method_na = $2`,

    FIND_OBJECT_METHOD_BY_IDS:
        'SELECT object_method_id FROM security.object_method WHERE object_id = $1 AND method_id = $2',

    FIND_TRANSACTION_BY_METHOD_OBJECT:
        'SELECT transaction_id FROM security.transaction WHERE method_id = $1 AND object_id = $2',

    FIND_OPTION_BY_NAME:
        'SELECT option_id, method_id FROM security.option WHERE option_na = $1 ORDER BY option_id LIMIT 1',

    FIND_PROFILE_METHOD_BY_IDS:
        'SELECT profile_method_id FROM security.profile_method WHERE profile_id = $1 AND method_id = $2',

    FIND_OBJECT_BY_NAME: 'SELECT object_id FROM security.object WHERE object_na = $1',
    FIND_METHOD_BY_NAME: 'SELECT method_id FROM security.method WHERE method_na = $1',
} as const
