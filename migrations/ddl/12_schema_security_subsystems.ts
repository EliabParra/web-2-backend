/**
 * Phase 2: Subsystem Infrastructure
 * Subsystems, menus, options, and their profile relations.
 * Tables are PLURAL with LONG column names (base state for naming migration).
 *
 * TODO(REVERT_NAMING): This file represents the original schema state.
 */
export const SUBSYSTEMS_SCHEMA = [
    // Subsystems
    `CREATE TABLE IF NOT EXISTS security.subsystems (
        subsystem_id SERIAL PRIMARY KEY,
        subsystem_name TEXT UNIQUE NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS security.subsystem_object (
        subsystem_object_id SERIAL PRIMARY KEY,
        object_id INTEGER REFERENCES security.objects(object_id),
        subsystem_id INTEGER REFERENCES security.subsystems(subsystem_id)
    );`,

    // Add subsystem_id FK to transactions (created in 02 without it)
    `ALTER TABLE security.transactions ADD COLUMN IF NOT EXISTS subsystem_id INTEGER REFERENCES security.subsystems(subsystem_id);`,

    // Menus & Options
    `CREATE TABLE IF NOT EXISTS security.menus (
        menu_id SERIAL PRIMARY KEY,
        menu_name TEXT NOT NULL,
        subsystem_id INTEGER REFERENCES security.subsystems(subsystem_id)
    );`,

    `CREATE TABLE IF NOT EXISTS security.options (
        option_id SERIAL PRIMARY KEY,
        option_name TEXT NOT NULL,
        method_id INTEGER REFERENCES security.methods(method_id)
    );`,

    `CREATE TABLE IF NOT EXISTS security.menu_option (
        menu_option_id SERIAL PRIMARY KEY,
        menu_id INTEGER REFERENCES security.menus(menu_id),
        option_id INTEGER REFERENCES security.options(option_id)
    );`,

    // Profile relations
    `CREATE TABLE IF NOT EXISTS security.profile_subsystem (
        profile_subsystem_id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES security.profiles(profile_id) ON DELETE CASCADE,
        subsystem_id INTEGER REFERENCES security.subsystems(subsystem_id) ON DELETE CASCADE,
        UNIQUE(profile_id, subsystem_id)
    );`,

    `CREATE TABLE IF NOT EXISTS security.profile_menu (
        profile_menu_id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES security.profiles(profile_id) ON DELETE CASCADE,
        menu_id INTEGER REFERENCES security.menus(menu_id) ON DELETE CASCADE,
        UNIQUE(profile_id, menu_id)
    );`,

    `CREATE TABLE IF NOT EXISTS security.profile_option (
        profile_option_id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES security.profiles(profile_id) ON DELETE CASCADE,
        option_id INTEGER REFERENCES security.options(option_id) ON DELETE CASCADE,
        UNIQUE(profile_id, option_id)
    );`,
]
