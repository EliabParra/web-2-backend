/**
 * Security Management SQL Queries
 * TODO(REVERT_NAMING): Revert all column names below (_na) to their original forms (_name)
 */
export const SecurityQueries = {
    // --- LOAD STRUCTURE ---
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    SELECT_SUBSYSTEMS: 'SELECT subsystem_id, subsystem_na FROM security.subsystem',
    // TODO(REVERT_NAMING): Revert menu_na to menu_name, option_na to option_name
    SELECT_MENUS: 'SELECT menu_id, menu_na, subsystem_id FROM security.menu',
    SELECT_OPTIONS: 'SELECT option_id, option_na, method_id FROM security.option',
    SELECT_MENU_OPTIONS: 'SELECT menu_id, option_id FROM security.menu_option',

    // --- LOAD ASSIGNMENTS ---
    SELECT_PROFILE_SUBSYSTEMS: 'SELECT profile_id, subsystem_id FROM security.profile_subsystem',
    SELECT_PROFILE_MENUS: 'SELECT profile_id, menu_id FROM security.profile_menu',
    SELECT_PROFILE_OPTIONS: 'SELECT profile_id, option_id FROM security.profile_option',

    // --- CRUD SUBSYSTEMS ---
    // TODO(REVERT_NAMING): Revert subsystem_na to subsystem_name
    INSERT_SUBSYSTEM:
        'INSERT INTO security.subsystem (subsystem_na) VALUES ($1) RETURNING subsystem_id, subsystem_na',
    DELETE_SUBSYSTEM: 'DELETE FROM security.subsystem WHERE subsystem_id = $1',

    // --- CRUD MENUS ---
    // TODO(REVERT_NAMING): Revert menu_na to menu_name
    INSERT_MENU:
        'INSERT INTO security.menu (menu_na, subsystem_id) VALUES ($1, $2) RETURNING menu_id, menu_na, subsystem_id',

    // --- CRUD OPTIONS ---
    // TODO(REVERT_NAMING): Revert option_na to option_name
    INSERT_OPTION:
        'INSERT INTO security.option (option_na, method_id) VALUES ($1, $2) RETURNING option_id, option_na, method_id',

    // --- ASSIGNMENTS ---
    ASSIGN_SUBSYSTEM:
        'INSERT INTO security.profile_subsystem (profile_id, subsystem_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    REVOKE_SUBSYSTEM:
        'DELETE FROM security.profile_subsystem WHERE profile_id = $1 AND subsystem_id = $2',

    ASSIGN_MENU:
        'INSERT INTO security.profile_menu (profile_id, menu_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    REVOKE_MENU: 'DELETE FROM security.profile_menu WHERE profile_id = $1 AND menu_id = $2',

    ASSIGN_OPTION_TO_MENU:
        'INSERT INTO security.menu_option (menu_id, option_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',

    ASSIGN_OPTION_TO_PROFILE:
        'INSERT INTO security.profile_option (profile_id, option_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    REVOKE_OPTION_FROM_PROFILE:
        'DELETE FROM security.profile_option WHERE profile_id = $1 AND option_id = $2',

    ASSIGN_USER_PROFILE:
        'INSERT INTO security.user_profile (user_id, profile_id, assigned_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
    REVOKE_USER_PROFILE:
        'DELETE FROM security.user_profile WHERE user_id = $1 AND profile_id = $2',

    // Load all permissions: profile_id -> object_name.method_na
    LOAD_PERMISSIONS: `
        SELECT
            p.profile_id,
            o.object_na,
            m.method_na
        FROM security.profile_method pm
        INNER JOIN security.profile p ON pm.profile_id = p.profile_id
        INNER JOIN security.method m ON pm.method_id = m.method_id
        INNER JOIN security.object_method om ON m.method_id = om.method_id
        INNER JOIN security.object o ON om.object_id = o.object_id
    `,

    // Grant permission (Dual Write Support)
    GRANT_PERMISSION: `
        INSERT INTO security.profile_method (profile_id, method_id)
        SELECT $1, m.method_id
        FROM security.method m
        INNER JOIN security.object_method om ON m.method_id = om.method_id
        INNER JOIN security.object o ON om.object_id = o.object_id
        WHERE o.object_na = $2 AND m.method_na = $3
        ON CONFLICT DO NOTHING
        RETURNING profile_method_id
    `,

    // Revoke permission (Dual Write Support)
    REVOKE_PERMISSION: `
        DELETE FROM security.profile_method
        WHERE profile_id = $1
        AND method_id = (
            SELECT m.method_id
            FROM security.method m
            INNER JOIN security.object_method om ON m.method_id = om.method_id
            INNER JOIN security.object o ON om.object_id = o.object_id
            WHERE o.object_na = $2 AND m.method_na = $3
        )
    `,
}
