/**
 * Reset Sequences
 * This runs AFTER all data seeds to sync SERIAL sequences with actual data.
 * Prevents "duplicate key" errors when inserting new records.
 */
export const RESET_SEQUENCES_SCHEMA = [
    // Reset transactions sequence
    `SELECT setval('security.transactions_transaction_id_seq', 
        COALESCE((SELECT MAX(transaction_id) FROM security.transactions), 0) + 1, false);`,

    // Reset methods sequence
    `SELECT setval('security.methods_method_id_seq', 
        COALESCE((SELECT MAX(method_id) FROM security.methods), 0) + 1, false);`,

    // Reset objects sequence
    `SELECT setval('security.objects_object_id_seq', 
        COALESCE((SELECT MAX(object_id) FROM security.objects), 0) + 1, false);`,

    // Reset profiles sequence
    `SELECT setval('security.profiles_profile_id_seq', 
        COALESCE((SELECT MAX(profile_id) FROM security.profiles), 0) + 1, false);`,

    // Reset users sequence
    `SELECT setval('security.users_user_id_seq', 
        COALESCE((SELECT MAX(user_id) FROM security.users), 0) + 1, false);`,

    // Reset user_profile sequence
    `SELECT setval('security.user_profile_user_profile_id_seq', 
        COALESCE((SELECT MAX(user_profile_id) FROM security.user_profile), 0) + 1, false);`,

    // Reset profile_method sequence
    `SELECT setval('security.profile_method_profile_method_id_seq', 
        COALESCE((SELECT MAX(profile_method_id) FROM security.profile_method), 0) + 1, false);`,

    // Reset object_method sequence
    `SELECT setval('security.object_method_object_method_id_seq', 
        COALESCE((SELECT MAX(object_method_id) FROM security.object_method), 0) + 1, false);`,
]
