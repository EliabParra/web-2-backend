export const AuditQueries = {
    insertAuditLog: `
        INSERT INTO security.audit 
        (request_id, user_id, profile_id, audit_tab, audit_met, tx, audit_det)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
}
