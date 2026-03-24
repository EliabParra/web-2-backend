/**
 * Auto-generated data for security.profile_subsystem
 * Generated at: 2026-03-24T23:05:33.598Z
 */
export const DATA_PROFILE_SUBSYSTEM_SCHEMA = [
    `INSERT INTO security.profile_subsystem (profile_subsystem_id, profile_id, subsystem_id) VALUES (1, 4, 1) ON CONFLICT (profile_subsystem_id) DO UPDATE SET profile_id = EXCLUDED.profile_id, subsystem_id = EXCLUDED.subsystem_id;`,
    `INSERT INTO security.profile_subsystem (profile_subsystem_id, profile_id, subsystem_id) VALUES (2, 3, 1) ON CONFLICT (profile_subsystem_id) DO UPDATE SET profile_id = EXCLUDED.profile_id, subsystem_id = EXCLUDED.subsystem_id;`,
]
