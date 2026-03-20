// TODO(REVERT_NAMING): Revert all column names: user_na→username, user_em→user_email, user_pw→user_password, user_em_verified_dt→user_email_verified_at, user_act→user_is_active, user_created_dt→user_created_at, user_last_login_dt→user_last_login_at, user_sol→user_solvent, user_updated_dt→user_updated_at
// TODO(REVERT_NAMING): Revert auth table names: password_reset→password_resets, one_time_code→one_time_codes; columns: password_reset_th→token_hash, password_reset_id→id, one_time_code_id→id, one_time_code_pu→purpose, one_time_code_ha→code_hash, one_time_code_consumed_dt→consumed_at, one_time_code_expires_dt→expires_at, one_time_code_created_dt→created_at, one_time_code_meta→meta, password_reset_expires_dt→expires_at, password_reset_used_dt→used_at, password_reset_created_dt→created_at, password_reset_st→token_sent_to, password_reset_ac→attempt_count, password_reset_meta→meta
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
    // TODO(REVERT_NAMING): Revert table password_reset→password_resets, columns password_reset_th→token_hash, password_reset_expires_dt→expires_at, password_reset_created_dt→created_at, password_reset_used_dt→used_at, password_reset_st→token_sent_to, password_reset_ip→request_ip, password_reset_ua→user_agent, password_reset_ac→attempt_count
    insertPasswordReset: `
        INSERT INTO security.password_reset
        (user_id, password_reset_th, password_reset_expires_dt, password_reset_created_dt, password_reset_used_dt, password_reset_ac, password_reset_st, password_reset_ip, password_reset_ua)
        VALUES ($1, $2, NOW() + ($3 || ' seconds')::INTERVAL, NOW(), NULL, 0, $4, $5, $6)
        RETURNING password_reset_id
    `,

    invalidateActivePasswordResetsForUser: `
        UPDATE security.password_reset
        SET password_reset_used_dt = NOW()
        WHERE user_id = $1 AND password_reset_used_dt IS NULL AND password_reset_expires_dt > NOW()
    `,

    getPasswordResetByTokenHash: `
        SELECT * FROM security.password_reset
        WHERE password_reset_th = $1
    `,

    markPasswordResetUsed: `
        UPDATE security.password_reset
        SET password_reset_used_dt = NOW()
        WHERE password_reset_id = $1
    `,

    // --- One-time codes
    // TODO(REVERT_NAMING): Revert table one_time_code→one_time_codes, columns one_time_code_pu→purpose, one_time_code_ha→code_hash, one_time_code_expires_dt→expires_at, one_time_code_created_dt→created_at, one_time_code_consumed_dt→consumed_at, one_time_code_meta→meta
    insertOneTimeCode: `
        INSERT INTO security.one_time_code
        (user_id, one_time_code_pu, one_time_code_ha, one_time_code_expires_dt, one_time_code_created_dt, one_time_code_meta)
        VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::INTERVAL, NOW(), $5)
        RETURNING one_time_code_id
    `,

    consumeOneTimeCode: `
        UPDATE security.one_time_code
        SET one_time_code_consumed_dt = NOW()
        WHERE one_time_code_id = $1
    `,

    getActiveOneTimeCodeForPurposeAndCodeHash: `
        SELECT * FROM security.one_time_code
        WHERE one_time_code_pu = $1
        AND one_time_code_ha = $2
        AND one_time_code_consumed_dt IS NULL
        AND one_time_code_expires_dt > NOW()
        ORDER BY one_time_code_created_dt DESC LIMIT 1
    `,
} as const

export type AuthQueryKey = keyof typeof AuthQueries
