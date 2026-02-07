/**
 * Auto-generated data for security.methods (Propagated from Legacy)
 * SPLIT into methods, object_method, transactions
 */
export const DATA_METHODS_SCHEMA = [
    // Methods (ID, Name) - Dropped object_id/tx from base table
    `INSERT INTO security.methods (method_id, method_name) VALUES ('1', 'register') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('2', 'verifyEmail') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('3', 'requestEmailVerification') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('4', 'requestPasswordReset') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('5', 'verifyPasswordReset') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,
    `INSERT INTO security.methods (method_id, method_name) VALUES ('6', 'resetPassword') ON CONFLICT (method_id) DO UPDATE SET method_name = EXCLUDED.method_name;`,

    // Object Method Link
    `INSERT INTO security.object_method (object_id, method_id) VALUES ('1', '1') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.object_method (object_id, method_id) VALUES ('1', '2') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.object_method (object_id, method_id) VALUES ('1', '3') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.object_method (object_id, method_id) VALUES ('1', '4') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.object_method (object_id, method_id) VALUES ('1', '5') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.object_method (object_id, method_id) VALUES ('1', '6') ON CONFLICT DO NOTHING;`,

    // Transactions (Assuming 1-1 mapping from old tx ID)
    `INSERT INTO security.transactions (transaction_number, method_id, object_id) VALUES ('1', '1', '1') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.transactions (transaction_number, method_id, object_id) VALUES ('2', '2', '1') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.transactions (transaction_number, method_id, object_id) VALUES ('3', '3', '1') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.transactions (transaction_number, method_id, object_id) VALUES ('4', '4', '1') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.transactions (transaction_number, method_id, object_id) VALUES ('5', '5', '1') ON CONFLICT DO NOTHING;`,
    `INSERT INTO security.transactions (transaction_number, method_id, object_id) VALUES ('6', '6', '1') ON CONFLICT DO NOTHING;`,
]
