/**
 * Auto-generated schema for security.audit_logs
 * Generated at: 2026-02-20T10:28:05.086Z
 */
export const AUDIT_LOGS_SCHEMA = [
    // Table Definition
    `create table if not exists security.audit_logs (
        id bigint not null,
        request_id text,
        user_id bigint,
        profile_id bigint,
        object_name text,
        method_name text,
        tx integer,
        action text,
        details jsonb,
        created_at timestamp with time zone not null default now()
    );`,

    // Indexes
    `CREATE UNIQUE INDEX audit_logs_pkey ON security.audit_logs USING btree (id);`,
    `CREATE INDEX ix_audit_logs_created_at ON security.audit_logs USING btree (created_at);`,
    `CREATE INDEX ix_audit_logs_profile_id ON security.audit_logs USING btree (profile_id);`,
    `CREATE INDEX ix_audit_logs_request_id ON security.audit_logs USING btree (request_id);`,
    `CREATE INDEX ix_audit_logs_user_id ON security.audit_logs USING btree (user_id);`,
]
