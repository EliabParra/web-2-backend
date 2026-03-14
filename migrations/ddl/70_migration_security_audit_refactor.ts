/**
 * Schema for security.audit (refactored from security.audit_logs)
 * Refactorización: Renombra audit_logs -> audit con columnas mnemotécnicas.
 */
export const AUDIT_REFACTOR_SCHEMA = [
    // Drop legacy table
    `DROP TABLE IF EXISTS security.audit_logs;`,

    // Table Definition
    `create table if not exists security.audit (
        audit_id bigint generated always as identity primary key,
        audit_tab text,
        audit_met text,
        audit_dt timestamp with time zone not null default now(),
        audit_det jsonb,
        user_id bigint,
        request_id text,
        profile_id bigint,
        tx integer
    );`,

    // Indexes
    `CREATE INDEX ix_audit_dt ON security.audit USING btree (audit_dt);`,
    `CREATE INDEX ix_audit_user_id ON security.audit USING btree (user_id);`,
    `CREATE INDEX ix_audit_profile_id ON security.audit USING btree (profile_id);`,
    `CREATE INDEX ix_audit_request_id ON security.audit USING btree (request_id);`,
]
