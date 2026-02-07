/**
 * Auto-generated data for security.user_profile (Propagated from Legacy)
 */
export const DATA_USER_PROFILES_SCHEMA = [
    `INSERT INTO security.user_profile (user_id, profile_id, assigned_at) VALUES ('1', '1', '2026-02-07T18:26:49.656Z') ON CONFLICT (user_id, profile_id) DO UPDATE SET assigned_at = EXCLUDED.assigned_at;`,
]
