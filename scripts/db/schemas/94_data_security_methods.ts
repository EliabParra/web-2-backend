/**
 * Auto-generated data for security.methods
 * Generated at: 2026-02-07T22:59:04.338Z
 */
export const DATA_METHODS_SCHEMA = [
    `INSERT INTO security.methods (method_id, method_name) VALUES ('1', 'register') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('2', 'verifyEmail') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('3', 'requestEmailVerification') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('4', 'requestPasswordReset') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('5', 'verifyPasswordReset') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('6', 'resetPassword') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
]
