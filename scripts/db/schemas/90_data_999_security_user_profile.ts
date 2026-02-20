/**
 * Auto-generated data for security.user_profile
 * Generated at: 2026-02-20T10:28:05.148Z
 */
export const DATA_USER_PROFILE_SCHEMA = [
    `INSERT INTO security.user_profile (user_profile_id, user_id, profile_id, assigned_at) VALUES ('1', '1', '1', '2026-02-07T18:26:49.656Z') ON CONFLICT (user_profile_id) DO UPDATE SET user_id = EXCLUDED.user_id, profile_id = EXCLUDED.profile_id, assigned_at = EXCLUDED.assigned_at;`,
]
