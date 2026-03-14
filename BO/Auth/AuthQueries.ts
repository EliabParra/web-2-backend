// TODO(REVERT_NAMING): Revert all column names: user_na→username, user_em→user_email, user_pw→user_password, user_em_verified_dt→user_email_verified_at, user_act→user_is_active, user_created_dt→user_created_at, user_last_login_dt→user_last_login_at, user_sol→user_solvent, user_updated_dt→user_updated_at
export const AuthQueries = {
    // --- Users
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    getUserByEmail: `
        SELECT
            u.user_id as id,
            u.user_na,
            u.user_em as email,
            u.user_em_verified_dt as email_verified_at,
            u.user_pw as password_hash,
            COALESCE(array_agg(p.profile_id) FILTER (WHERE p.profile_id IS NOT NULL), '{}') as profile_ids
        FROM security."user" u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE u.user_em = $1
        GROUP BY u.user_id, u.user_na, u.user_em, u.user_em_verified_dt, u.user_pw
    `,

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    getUserByEmailRaw: `
        SELECT
            u.user_id,
            u.user_na,
            u.user_em,
            u.user_em_verified_dt,
            u.user_pw,
            COALESCE(array_agg(p.profile_id) FILTER (WHERE p.profile_id IS NOT NULL), '{}') as profile_ids,
            u.user_act,
            u.user_created_dt,
            u.user_last_login_dt,
            u.user_sol,
            u.person_id
        FROM security."user" u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE u.user_em = $1
        GROUP BY u.user_id, u.user_na, u.user_em, u.user_em_verified_dt, u.user_pw, u.user_act, u.user_created_dt, u.user_last_login_dt, u.user_sol, u.person_id
    `,

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    getUserByUsername: `
        SELECT
            u.user_id,
            u.user_na,
            u.user_em,
            u.user_pw,
            u.user_em_verified_dt,
            COALESCE(array_agg(p.profile_id) FILTER (WHERE p.profile_id IS NOT NULL), '{}') as profile_ids
        FROM security."user" u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE user_na = $1
        GROUP BY u.user_id, u.user_na, u.user_em, u.user_pw, u.user_em_verified_dt
    `,

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    getUserBaseByEmail: `
        SELECT
            u.user_id,
            u.user_na,
            u.user_em,
            u.user_pw,
            u.user_em_verified_dt,
            COALESCE(array_agg(p.profile_id) FILTER (WHERE p.profile_id IS NOT NULL), '{}') as profile_ids
        FROM security."user" u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE u.user_em = $1
        GROUP BY u.user_id, u.user_na, u.user_em, u.user_pw, u.user_em_verified_dt
    `,

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    insertUser: `
        INSERT INTO security."user" (user_na, user_em, user_pw)
        VALUES ($1, $2, $3)
        RETURNING user_id
    `,

    upsertUserProfile: `
        INSERT INTO security.user_profile (user_id, profile_id, assigned_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, profile_id) DO UPDATE SET assigned_at = NOW()
    `,

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    setUserEmailVerified: `
        UPDATE security."user"
        SET user_em_verified_dt = NOW()
        WHERE user_id = $1
    `,

    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    updateUserPassword: `
        UPDATE security."user"
        SET user_pw = $2
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
