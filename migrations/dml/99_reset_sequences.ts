/**
 * Reset Sequences
 * This runs AFTER all data seeds to sync SERIAL sequences with actual data.
 * Prevents "duplicate key" errors when inserting new records.
 */
export const RESET_SEQUENCES_SCHEMA = [
    // Security core
    `SELECT setval(pg_get_serial_sequence('security.transaction', 'transaction_id'),
        COALESCE((SELECT MAX(transaction_id) FROM security.transaction), 0) + 1, false);`,

    `SELECT setval(pg_get_serial_sequence('security.method', 'method_id'),
        COALESCE((SELECT MAX(method_id) FROM security.method), 0) + 1, false);`,

    `SELECT setval(pg_get_serial_sequence('security.object', 'object_id'),
        COALESCE((SELECT MAX(object_id) FROM security.object), 0) + 1, false);`,

    `SELECT setval(pg_get_serial_sequence('security.profile', 'profile_id'),
        COALESCE((SELECT MAX(profile_id) FROM security.profile), 0) + 1, false);`,

    `SELECT setval(pg_get_serial_sequence('security.user', 'user_id'),
        COALESCE((SELECT MAX(user_id) FROM security.user), 0) + 1, false);`,

    `SELECT setval(pg_get_serial_sequence('security.user_profile', 'user_profile_id'),
        COALESCE((SELECT MAX(user_profile_id) FROM security.user_profile), 0) + 1, false);`,

    `SELECT setval(pg_get_serial_sequence('security.profile_method', 'profile_method_id'),
        COALESCE((SELECT MAX(profile_method_id) FROM security.profile_method), 0) + 1, false);`,

    `SELECT setval(pg_get_serial_sequence('security.object_method', 'object_method_id'),
        COALESCE((SELECT MAX(object_method_id) FROM security.object_method), 0) + 1, false);`,

    // Auth tables
    `SELECT setval(pg_get_serial_sequence('security.password_reset', 'password_reset_id'),
        COALESCE((SELECT MAX(password_reset_id) FROM security.password_reset), 0) + 1, false);`,

    `SELECT setval(pg_get_serial_sequence('security.one_time_code', 'one_time_code_id'),
        COALESCE((SELECT MAX(one_time_code_id) FROM security.one_time_code), 0) + 1, false);`,

    `SELECT setval(pg_get_serial_sequence('security.user_device', 'user_device_id'),
        COALESCE((SELECT MAX(user_device_id) FROM security.user_device), 0) + 1, false);`,
]
