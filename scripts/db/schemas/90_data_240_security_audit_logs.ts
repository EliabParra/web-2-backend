/**
 * Auto-generated data for security.audit_logs
 * Generated at: 2026-02-08T02:50:22.604Z
 */
export const DATA_AUDIT_LOGS_SCHEMA = [
    `INSERT INTO security.audit_logs (id, request_id, user_id, profile_id, object_name, method_name, tx, action, details, created_at) VALUES ('1', 'a3dc1c7a-5464-410a-bb8e-e0950b3818bc', '1', '1', NULL, NULL, NULL, 'login', '{"username":"admin"}', '2026-02-08T02:44:31.516Z') ON CONFLICT (id) DO UPDATE SET request_id = EXCLUDED.request_id, user_id = EXCLUDED.user_id, profile_id = EXCLUDED.profile_id, object_name = EXCLUDED.object_name, method_name = EXCLUDED.method_name, tx = EXCLUDED.tx, action = EXCLUDED.action, details = EXCLUDED.details, created_at = EXCLUDED.created_at;`,
    `INSERT INTO security.audit_logs (id, request_id, user_id, profile_id, object_name, method_name, tx, action, details, created_at) VALUES ('2', '4f773a9b-7818-4c8b-9457-f1614f993d7d', '1', '1', NULL, NULL, NULL, 'logout', '{}', '2026-02-08T02:44:46.335Z') ON CONFLICT (id) DO UPDATE SET request_id = EXCLUDED.request_id, user_id = EXCLUDED.user_id, profile_id = EXCLUDED.profile_id, object_name = EXCLUDED.object_name, method_name = EXCLUDED.method_name, tx = EXCLUDED.tx, action = EXCLUDED.action, details = EXCLUDED.details, created_at = EXCLUDED.created_at;`,
]
