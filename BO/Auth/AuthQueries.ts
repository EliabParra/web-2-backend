export const AuthQueries = {
    // --- Users
    getUserByEmail: `
        SELECT u.user_id as id, u.username, u.user_email as email, u.user_email_verified_at as email_verified_at, u.user_password as password_hash, p.profile_id
        FROM security.users u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE u.user_email = $1
    `,
    // NOTE: Aliasing above to maintain temporary compatibility or should I return raw new names?
    // AuthRepository.ts will be refactored to read new names.
    // AuthTypes.ts UserRow uses new names.
    // So I should NOT use aliases like 'as id'. I should return 'user_id'.

    getUserByEmailRaw: `
        SELECT u.user_id, u.username, u.user_email, u.user_email_verified_at, u.user_password, p.profile_id, u.user_is_active, u.user_created_at, u.user_last_login_at, u.user_solvent, u.person_id
        FROM security.users u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE u.user_email = $1
    `,

    getUserByUsername: `
        SELECT user_id, username, user_email, user_password, user_email_verified_at 
        FROM security.users 
        WHERE username = $1
    `,

    getUserBaseByEmail: `
        SELECT user_id, username, user_email, user_password, user_email_verified_at 
        FROM security.users 
        WHERE user_email = $1
    `,

    insertUser: `
        INSERT INTO security.users (username, user_email, user_password)
        VALUES ($1, $2, $3)
        RETURNING user_id
    `,

    upsertUserProfile: `
        INSERT INTO security.user_profile (user_id, profile_id, assigned_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, profile_id) DO UPDATE SET assigned_at = NOW()
    `,

    setUserEmailVerified: `
        UPDATE security.users
        SET user_email_verified_at = NOW()
        WHERE user_id = $1
    `,

    updateUserPassword: `
        UPDATE security.users
        SET user_password = $2
        WHERE user_id = $1
    `,

    // --- Password reset
    insertPasswordReset: `
        INSERT INTO security.password_resets
        (user_id, token_hash, expires_at, created_at, used_at, attempt_count, token_sent_to, request_ip, user_agent)
        VALUES ($1, $2, NOW() + ($3 || ' seconds')::INTERVAL, NOW(), NULL, 0, $4, $5, $6)
        RETURNING id
    `,

    invalidateActivePasswordResetsForUser: `
        UPDATE security.password_resets
        SET used_at = NOW()
        WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
    `,

    getPasswordResetByTokenHash: `
        SELECT * FROM security.password_resets
        WHERE token_hash = $1
    `,

    markPasswordResetUsed: `
        UPDATE security.password_resets
        SET used_at = NOW()
        WHERE id = $1
    `,

    // --- One-time codes
    insertOneTimeCode: `
        INSERT INTO security.one_time_codes
        (user_id, purpose, code_hash, expires_at, created_at, meta)
        VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::INTERVAL, NOW(), $5)
        RETURNING id
    `,

    consumeOneTimeCode: `
        UPDATE security.one_time_codes
        SET consumed_at = NOW()
        WHERE id = $1
    `,

    // Fix query usage of jsonb operator
    getActiveOneTimeCodeForPurposeAndTokenHash: `
        SELECT * FROM security.one_time_codes
        WHERE purpose = $1 
        AND (meta->>'tokenHash') = $2
        AND consumed_at IS NULL 
        AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
    `,
} as const

export type AuthQueryKey = keyof typeof AuthQueries
