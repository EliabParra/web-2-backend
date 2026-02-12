/**
 * Security Management SQL Queries
 */
export const SecurityQueries = {
    // --- LOAD STRUCTURE ---
    SELECT_SUBSYSTEMS: 'SELECT subsystem_id, subsystem_name FROM security.subsystems',
    SELECT_MENUS: 'SELECT menu_id, menu_name, subsystem_id FROM security.menus',
    SELECT_OPTIONS: 'SELECT option_id, option_name, method_id FROM security.options',
    SELECT_MENU_OPTIONS: 'SELECT menu_id, option_id FROM security.menu_option',

    // --- LOAD ASSIGNMENTS ---
    SELECT_PROFILE_SUBSYSTEMS: 'SELECT profile_id, subsystem_id FROM security.profile_subsystem',
    SELECT_PROFILE_MENUS: 'SELECT profile_id, menu_id FROM security.profile_menu',
    SELECT_PROFILE_OPTIONS: 'SELECT profile_id, option_id FROM security.profile_option',

    // --- CRUD SUBSYSTEMS ---
    INSERT_SUBSYSTEM:
        'INSERT INTO security.subsystems (subsystem_name) VALUES ($1) RETURNING subsystem_id, subsystem_name',
    DELETE_SUBSYSTEM: 'DELETE FROM security.subsystems WHERE subsystem_id = $1',

    // --- CRUD MENUS ---
    INSERT_MENU:
        'INSERT INTO security.menus (menu_name, subsystem_id) VALUES ($1, $2) RETURNING menu_id, menu_name, subsystem_id',

    // --- CRUD OPTIONS ---
    INSERT_OPTION:
        'INSERT INTO security.options (option_name, method_id) VALUES ($1, $2) RETURNING option_id, option_name, method_id',

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
}
