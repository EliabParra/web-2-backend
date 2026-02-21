/**
 * Reset Sequences
 * This runs AFTER all data seeds to sync SERIAL sequences with actual data.
 * Prevents "duplicate key" errors when inserting new records.
 */
export const RESET_SEQUENCES_SCHEMA = [
    // Reset transactions sequence
    `SELECT setval(pg_get_serial_sequence('security.transactions', 'transaction_id'), 
        COALESCE((SELECT MAX(transaction_id) FROM security.transactions), 0) + 1, false);`,

    // Reset methods sequence
    `SELECT setval(pg_get_serial_sequence('security.methods', 'method_id'), 
        COALESCE((SELECT MAX(method_id) FROM security.methods), 0) + 1, false);`,

    // Reset objects sequence
    `SELECT setval(pg_get_serial_sequence('security.objects', 'object_id'), 
        COALESCE((SELECT MAX(object_id) FROM security.objects), 0) + 1, false);`,

    // Reset profiles sequence
    `SELECT setval(pg_get_serial_sequence('security.profiles', 'profile_id'), 
        COALESCE((SELECT MAX(profile_id) FROM security.profiles), 0) + 1, false);`,

    // Reset users sequence
    `SELECT setval(pg_get_serial_sequence('security.users', 'user_id'), 
        COALESCE((SELECT MAX(user_id) FROM security.users), 0) + 1, false);`,

    // Reset user_profile sequence
    `SELECT setval(pg_get_serial_sequence('security.user_profile', 'user_profile_id'), 
        COALESCE((SELECT MAX(user_profile_id) FROM security.user_profile), 0) + 1, false);`,

    // Reset profile_method sequence
    `SELECT setval(pg_get_serial_sequence('security.profile_method', 'profile_method_id'), 
        COALESCE((SELECT MAX(profile_method_id) FROM security.profile_method), 0) + 1, false);`,

    // Reset object_method sequence
    `SELECT setval(pg_get_serial_sequence('security.object_method', 'object_method_id'), 
        COALESCE((SELECT MAX(object_method_id) FROM security.object_method), 0) + 1, false);`,
]
