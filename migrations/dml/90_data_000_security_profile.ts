/**
 * Auto-generated data for security.profile
 * Generated at: 2026-03-24T23:05:33.515Z
 */
export const DATA_PROFILE_SCHEMA = [
    `INSERT INTO security.profile (profile_id, profile_na) VALUES ('1', 'public') ON CONFLICT (profile_id) DO UPDATE SET profile_na = EXCLUDED.profile_na;`,
    `INSERT INTO security.profile (profile_id, profile_na) VALUES ('2', 'session') ON CONFLICT (profile_id) DO UPDATE SET profile_na = EXCLUDED.profile_na;`,
    `INSERT INTO security.profile (profile_id, profile_na) VALUES ('3', 'super_admin') ON CONFLICT (profile_id) DO UPDATE SET profile_na = EXCLUDED.profile_na;`,
    `INSERT INTO security.profile (profile_id, profile_na) VALUES ('4', 'security_admin') ON CONFLICT (profile_id) DO UPDATE SET profile_na = EXCLUDED.profile_na;`,
    `INSERT INTO security.profile (profile_id, profile_na) VALUES ('5', 'supervisor') ON CONFLICT (profile_id) DO UPDATE SET profile_na = EXCLUDED.profile_na;`,
]
