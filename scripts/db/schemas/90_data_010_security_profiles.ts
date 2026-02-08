/**
 * Auto-generated data for security.profiles
 * Generated at: 2026-02-08T02:50:22.650Z
 */
export const DATA_PROFILES_SCHEMA = [
    `INSERT INTO security.profiles (profile_id, profile_name) VALUES ('1', 'public') ON CONFLICT (profile_id) DO UPDATE SET profile_name = EXCLUDED.profile_name;`,
]
