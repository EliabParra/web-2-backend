/**
 * Phase 2: User Extensions
 * Additional columns for user management (email, verification, solvency).
 * Column names are LONG (base state for naming migration).
 *
 * TODO(REVERT_NAMING): This file represents the original column names.
 */
export const USERS_EXT_SCHEMA = [
    `ALTER TABLE security.users ADD COLUMN IF NOT EXISTS user_email TEXT;`,
    `ALTER TABLE security.users ADD COLUMN IF NOT EXISTS user_email_verified_at TIMESTAMPTZ;`,
    `ALTER TABLE security.users ADD COLUMN IF NOT EXISTS user_solvent BOOLEAN DEFAULT TRUE;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_users_user_email ON security.users(user_email) WHERE user_email IS NOT NULL;`,
]
