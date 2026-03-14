/**
 * Security Management SQL Queries
 * TODO(REVERT_NAMING): Revert all column names below (_na) to their original forms (_name)
 */
export const SecurityQueries = {
    // --- LOAD STRUCTURE ---
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    SELECT_SUBSYSTEMS: 'SELECT subsystem_id, subsystem_name FROM security.subsystems',
    // TODO(REVERT_NAMING): Revert menu_na to menu_name, option_na to option_name
    SELECT_MENUS: 'SELECT menu_id, menu_na, subsystem_id FROM security.menu',
    SELECT_OPTIONS: 'SELECT option_id, option_na, method_id FROM security.option',
    SELECT_MENU_OPTIONS: 'SELECT menu_id, option_id FROM security.menu_option',

    // --- LOAD ASSIGNMENTS ---
    SELECT_PROFILE_SUBSYSTEMS: 'SELECT profile_id, subsystem_id FROM security.profile_subsystem',
    SELECT_PROFILE_MENUS: 'SELECT profile_id, menu_id FROM security.profile_menu',
    SELECT_PROFILE_OPTIONS: 'SELECT profile_id, option_id FROM security.profile_option',

    // --- CRUD SUBSYSTEMS ---
    INSERT_SUBSYSTEM:
        'INSERT INTO security.subsystems (subsystem_name) VALUES ($1) RETURNING subsystem_id, subsystem_name', // subsystems not renamed
    DELETE_SUBSYSTEM: 'DELETE FROM security.subsystems WHERE subsystem_id = $1',

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
}
