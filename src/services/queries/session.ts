export const SessionQueries = {
    getUserByEmail: `
        SELECT u.user_id, u.username, u.user_email, u.user_email_verified_at, u.user_password, p.profile_id
        FROM security.users u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id 
        WHERE u.user_email = $1
    `,
    getUserByUsername: `
        SELECT u.user_id, u.username, u.user_email, u.user_password, u.user_email_verified_at, p.profile_id
        FROM security.users u
        LEFT JOIN security.user_profile p ON u.user_id = p.user_id 
        WHERE u.username = $1
    `,
    updateUserLastLogin: `
        UPDATE security.users SET user_last_login_at = NOW(), user_updated_at = NOW() WHERE user_id = $1
    `,
}
