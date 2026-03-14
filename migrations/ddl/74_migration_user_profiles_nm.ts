/**
 * Migration 74: N:M User-Profile Backfill
 *
 * Migra la asignación 1:N (`security."user".profile_id`) al modelo N:M
 * usando `security.user_profile` y finalmente elimina la columna legacy.
 *
 * TODO(REVERT_NAMING): Singular tables & N:M profiles
 */
export const USER_PROFILES_NM_SCHEMA = [
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    `INSERT INTO security.user_profile (user_id, profile_id, assigned_at)
     SELECT u.user_id, u.profile_id, NOW()
     FROM security."user" u
     WHERE u.profile_id IS NOT NULL
     ON CONFLICT (user_id, profile_id) DO NOTHING;`,

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    `ALTER TABLE security."user" DROP COLUMN IF EXISTS profile_id;`,
]
