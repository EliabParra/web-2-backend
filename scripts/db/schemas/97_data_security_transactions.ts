/**
 * Auto-generated data for security.transactions
 * Generated at: 2026-02-07T22:59:04.415Z
 */
export const DATA_TRANSACTIONS_SCHEMA = [
    `INSERT INTO security.transactions (transaction_id, transaction_number, method_id, object_id, subsystem_id) VALUES (1, '1', 1, 1, NULL) ON CONFLICT (transaction_id) DO UPDATE SET transaction_number = EXCLUDED.transaction_number, method_id = EXCLUDED.method_id, object_id = EXCLUDED.object_id, subsystem_id = EXCLUDED.subsystem_id;`,
    `INSERT INTO security.transactions (transaction_id, transaction_number, method_id, object_id, subsystem_id) VALUES (2, '2', 2, 1, NULL) ON CONFLICT (transaction_id) DO UPDATE SET transaction_number = EXCLUDED.transaction_number, method_id = EXCLUDED.method_id, object_id = EXCLUDED.object_id, subsystem_id = EXCLUDED.subsystem_id;`,
    `INSERT INTO security.transactions (transaction_id, transaction_number, method_id, object_id, subsystem_id) VALUES (3, '3', 3, 1, NULL) ON CONFLICT (transaction_id) DO UPDATE SET transaction_number = EXCLUDED.transaction_number, method_id = EXCLUDED.method_id, object_id = EXCLUDED.object_id, subsystem_id = EXCLUDED.subsystem_id;`,
    `INSERT INTO security.transactions (transaction_id, transaction_number, method_id, object_id, subsystem_id) VALUES (4, '4', 4, 1, NULL) ON CONFLICT (transaction_id) DO UPDATE SET transaction_number = EXCLUDED.transaction_number, method_id = EXCLUDED.method_id, object_id = EXCLUDED.object_id, subsystem_id = EXCLUDED.subsystem_id;`,
    `INSERT INTO security.transactions (transaction_id, transaction_number, method_id, object_id, subsystem_id) VALUES (5, '5', 5, 1, NULL) ON CONFLICT (transaction_id) DO UPDATE SET transaction_number = EXCLUDED.transaction_number, method_id = EXCLUDED.method_id, object_id = EXCLUDED.object_id, subsystem_id = EXCLUDED.subsystem_id;`,
    `INSERT INTO security.transactions (transaction_id, transaction_number, method_id, object_id, subsystem_id) VALUES (6, '6', 6, 1, NULL) ON CONFLICT (transaction_id) DO UPDATE SET transaction_number = EXCLUDED.transaction_number, method_id = EXCLUDED.method_id, object_id = EXCLUDED.object_id, subsystem_id = EXCLUDED.subsystem_id;`,
]
