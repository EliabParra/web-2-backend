/**
 * Auto-generated data for security.methods
 * Generated at: 2026-02-20T10:28:05.094Z
 */
export const DATA_METHODS_SCHEMA = [
    `INSERT INTO security.methods (method_id, method_name) VALUES ('27', 'register') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('28', 'verifyEmail') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('29', 'requestEmailVerification') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('30', 'requestPasswordReset') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('31', 'verifyPasswordReset') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('32', 'resetPassword') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('33', 'requestUsername') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('34', 'send') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('35', 'broadcast') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('36', 'simulate') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('37', 'joinRoom') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('38', 'leaveRoom') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('39', 'emitRoom') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
]
