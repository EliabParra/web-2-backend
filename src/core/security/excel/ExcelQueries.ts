/**
 * Queries SQL parametrizadas para el módulo Excel de seguridad.
 * Todas las consultas usan parámetros posicionales ($1, $2...) para prevenir inyección SQL.
 *
 * @module security/excel
 */
export const ExcelQueries = {
    // ═══════════════════════════════════════════════════════════════════
    // EXPORT — Consultas de lectura para exportación
    // ═══════════════════════════════════════════════════════════════════

    SELECT_PROFILES: 'SELECT profile_name FROM security.profiles ORDER BY profile_id',

    SELECT_USERS: `
        SELECT u.username, '' as password, p.profile_name
        FROM security.users u
        LEFT JOIN security.profiles p ON u.profile_id = p.profile_id
        ORDER BY u.user_id`,

    SELECT_SUBSYSTEMS: 'SELECT subsystem_name FROM security.subsystems ORDER BY subsystem_id',

    SELECT_OBJECTS: 'SELECT object_name FROM security.objects ORDER BY object_id',

    SELECT_METHODS_EXPORT: `
        SELECT obj.object_name, met.method_name
        FROM security.object_method om
        INNER JOIN security.objects obj ON om.object_id = obj.object_id
        INNER JOIN security.methods met ON om.method_id = met.method_id
        ORDER BY obj.object_name, met.method_name`,

    SELECT_MENUS: `
        SELECT m.menu_name, s.subsystem_name
        FROM security.menus m
        INNER JOIN security.subsystems s ON m.subsystem_id = s.subsystem_id
        ORDER BY m.menu_id`,

    SELECT_OPTIONS: `
        SELECT o.option_name,
               COALESCE(obj.object_name || '.' || met.method_name, '') as object_method,
               COALESCE(m.menu_name, '') as menu_name
        FROM security.options o
        LEFT JOIN security.methods met ON o.method_id = met.method_id
        LEFT JOIN security.object_method om ON met.method_id = om.method_id
        LEFT JOIN security.objects obj ON om.object_id = obj.object_id
        LEFT JOIN security.menu_option mo ON o.option_id = mo.option_id
        LEFT JOIN security.menus m ON mo.menu_id = m.menu_id
        ORDER BY o.option_id`,

    SELECT_PERMISSIONS: `
        SELECT p.profile_name, obj.object_name || '.' || met.method_name as object_method
        FROM security.profile_method pm
        INNER JOIN security.profiles p ON pm.profile_id = p.profile_id
        INNER JOIN security.methods met ON pm.method_id = met.method_id
        INNER JOIN security.object_method om ON met.method_id = om.method_id
        INNER JOIN security.objects obj ON om.object_id = obj.object_id
        ORDER BY p.profile_name, obj.object_name, met.method_name`,

    SELECT_ASSIGNMENTS: `
        SELECT p.profile_name, s.subsystem_name,
               COALESCE(m.menu_name, '') as menu_name,
               COALESCE(o.option_name, '') as option_name
        FROM security.profile_subsystem ps
        INNER JOIN security.profiles p ON ps.profile_id = p.profile_id
        INNER JOIN security.subsystems s ON ps.subsystem_id = s.subsystem_id
        LEFT JOIN security.profile_menu pm ON ps.profile_id = pm.profile_id
        LEFT JOIN security.menus m ON pm.menu_id = m.menu_id AND m.subsystem_id = s.subsystem_id
        LEFT JOIN security.profile_option po ON ps.profile_id = po.profile_id
        LEFT JOIN security.menu_option mo ON po.option_id = mo.option_id AND mo.menu_id = m.menu_id
        LEFT JOIN security.options o ON po.option_id = o.option_id
        ORDER BY p.profile_name, s.subsystem_name`,

    SELECT_OBJECT_METHODS: `
        SELECT obj.object_name || '.' || met.method_name as object_method
        FROM security.object_method om
        INNER JOIN security.objects obj ON om.object_id = obj.object_id
        INNER JOIN security.methods met ON om.method_id = met.method_id
        ORDER BY obj.object_name, met.method_name`,

    SELECT_MENU_NAMES: 'SELECT menu_name FROM security.menus ORDER BY menu_name',

    // ═══════════════════════════════════════════════════════════════════
    // IMPORT — Inserciones parametrizadas
    // ═══════════════════════════════════════════════════════════════════

    INSERT_PROFILE: `
        INSERT INTO security.profiles (profile_name)
        VALUES ($1) ON CONFLICT (profile_name) DO NOTHING
        RETURNING profile_id`,

    INSERT_USER: `
        INSERT INTO security.users (username, user_password, profile_id)
        VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING
        RETURNING user_id`,

    INSERT_SUBSYSTEM: `
        INSERT INTO security.subsystems (subsystem_name)
        VALUES ($1) ON CONFLICT DO NOTHING
        RETURNING subsystem_id`,

    INSERT_OBJECT: `
        INSERT INTO security.objects (object_name)
        VALUES ($1) ON CONFLICT DO NOTHING
        RETURNING object_id`,

    INSERT_METHOD: `
        INSERT INTO security.methods (method_name)
        VALUES ($1) ON CONFLICT DO NOTHING
        RETURNING method_id`,

    INSERT_OBJECT_METHOD: `
        INSERT INTO security.object_method (object_id, method_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING`,

    INSERT_TRANSACTION: `
        INSERT INTO security.transactions (transaction_number, method_id, object_id)
        VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,

    SELECT_NEXT_TX: `
        SELECT COALESCE(MAX(transaction_number::integer), 0) + 1 AS next_tx
        FROM security.transactions`,

    INSERT_MENU: `
        INSERT INTO security.menus (menu_name, subsystem_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING
        RETURNING menu_id`,

    INSERT_OPTION: `
        INSERT INTO security.options (option_name, method_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING
        RETURNING option_id`,

    INSERT_MENU_OPTION: `
        INSERT INTO security.menu_option (menu_id, option_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING`,

    INSERT_PERMISSION: `
        INSERT INTO security.profile_method (profile_id, method_id)
        SELECT p.profile_id, met.method_id
        FROM security.profiles p, security.methods met
        INNER JOIN security.object_method om ON met.method_id = om.method_id
        INNER JOIN security.objects obj ON om.object_id = obj.object_id
        WHERE p.profile_name = $1 AND obj.object_name = $2 AND met.method_name = $3
        ON CONFLICT DO NOTHING
        RETURNING profile_method_id`,

    INSERT_PROFILE_SUBSYSTEM: `
        INSERT INTO security.profile_subsystem (profile_id, subsystem_id)
        SELECT p.profile_id, s.subsystem_id
        FROM security.profiles p, security.subsystems s
        WHERE p.profile_name = $1 AND s.subsystem_name = $2
        ON CONFLICT DO NOTHING`,

    INSERT_PROFILE_MENU: `
        INSERT INTO security.profile_menu (profile_id, menu_id)
        SELECT p.profile_id, m.menu_id
        FROM security.profiles p, security.menus m
        INNER JOIN security.subsystems s ON m.subsystem_id = s.subsystem_id
        WHERE p.profile_name = $1 AND m.menu_name = $2 AND s.subsystem_name = $3
        ON CONFLICT DO NOTHING`,

    INSERT_PROFILE_OPTION: `
        INSERT INTO security.profile_option (profile_id, option_id)
        SELECT p.profile_id, o.option_id
        FROM security.profiles p, security.options o
        WHERE p.profile_name = $1 AND o.option_name = $2
        ON CONFLICT DO NOTHING`,

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP — Resolución de FKs por nombre
    // ═══════════════════════════════════════════════════════════════════

    FIND_PROFILE_BY_NAME: 'SELECT profile_id FROM security.profiles WHERE profile_name = $1',
    FIND_SUBSYSTEM_BY_NAME: 'SELECT subsystem_id FROM security.subsystems WHERE subsystem_name = $1',
    FIND_MENU_BY_NAME: 'SELECT menu_id FROM security.menus WHERE menu_name = $1',

    FIND_METHOD_BY_OBJECT_METHOD: `
        SELECT met.method_id
        FROM security.methods met
        INNER JOIN security.object_method om ON met.method_id = om.method_id
        INNER JOIN security.objects obj ON om.object_id = obj.object_id
        WHERE obj.object_name = $1 AND met.method_name = $2`,

    FIND_OBJECT_BY_NAME: 'SELECT object_id FROM security.objects WHERE object_name = $1',
    FIND_METHOD_BY_NAME: 'SELECT method_id FROM security.methods WHERE method_name = $1',
} as const
