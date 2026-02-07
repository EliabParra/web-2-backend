/**
 * Auto-generated data for security.users (Propagated from Legacy)
 */
export const DATA_USERS_SCHEMA = [
    `INSERT INTO security.users (user_id, username, user_password, profile_id, user_is_active, user_created_at, user_updated_at, user_last_login_at, user_email, user_email_verified_at) VALUES ('1', 'admin', '$2b$10$8T.rwVF5YCDjqRc3oeYX2.t.8fDRK1R1FOAz7REW3KS9GZQj3v3km', '1', TRUE, '2026-02-07T18:26:49.649Z', '2026-02-07T18:26:49.649Z', NULL, NULL, NULL) ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, user_password = EXCLUDED.user_password, profile_id = EXCLUDED.profile_id, user_is_active = EXCLUDED.user_is_active, user_created_at = EXCLUDED.user_created_at, user_updated_at = EXCLUDED.user_updated_at, user_last_login_at = EXCLUDED.user_last_login_at, user_email = EXCLUDED.user_email, user_email_verified_at = EXCLUDED.user_email_verified_at;`,
]
