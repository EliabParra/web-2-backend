// TODO(REVERT_NAMING): Revert all column names: user_na→username, user_em→user_email, user_pw→user_password, user_em_verified_dt→user_email_verified_at, user_updated_dt→user_updated_at, user_last_login_dt→user_last_login_at
export const SessionQueries = {
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    getUserByEmail: `
        SELECT u.user_id, u.user_na, u.user_em, u.user_em_verified_dt, u.user_pw,
               COALESCE(array_agg(p.profile_id) FILTER (WHERE p.profile_id IS NOT NULL), '{}') AS profile_ids
        FROM security."user" u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE u.user_em = $1
        GROUP BY u.user_id, u.user_na, u.user_em, u.user_em_verified_dt, u.user_pw
    `,
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    getUserByUsername: `
        SELECT u.user_id, u.user_na, u.user_em, u.user_pw, u.user_em_verified_dt,
               COALESCE(array_agg(p.profile_id) FILTER (WHERE p.profile_id IS NOT NULL), '{}') AS profile_ids
        FROM security."user" u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id
        WHERE u.user_na = $1
        GROUP BY u.user_id, u.user_na, u.user_em, u.user_pw, u.user_em_verified_dt
    `,
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    updateUserLastLogin: `
        UPDATE security."user" SET user_last_login_dt = NOW(), user_updated_dt = NOW() WHERE user_id = $1
    `,
}
