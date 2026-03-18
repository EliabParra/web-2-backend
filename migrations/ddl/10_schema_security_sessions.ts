/**
 * Phase 2: Sessions
 * Express-session storage table.
 */
export const SESSIONS_SCHEMA = [
    `CREATE TABLE IF NOT EXISTS security.sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS ix_sessions_expire ON security.sessions(expire);`,
]
