export const UserQueries = {
    findAll: `
        SELECT
            u.user_id,
            u.user_na,
            u.user_pw,
            u.user_act,
            u.user_created_dt,
            u.user_updated_dt,
            u.user_last_login_dt,
            u.user_em,
            u.user_em_verified_dt,
            u.user_sol,
            u.person_id,
            p.person_ci,
            p.person_na,
            p.person_ln,
            p.person_ph,
            p.person_deg
        FROM security."user" u
        LEFT JOIN business.person p ON p.person_id = u.person_id
    `,
    findById: `
        SELECT
            u.user_id,
            u.user_na,
            u.user_pw,
            u.user_act,
            u.user_created_dt,
            u.user_updated_dt,
            u.user_last_login_dt,
            u.user_em,
            u.user_em_verified_dt,
            u.user_sol,
            u.person_id,
            p.person_ci,
            p.person_na,
            p.person_ln,
            p.person_ph,
            p.person_deg
        FROM security."user" u
        LEFT JOIN business.person p ON p.person_id = u.person_id
        WHERE u.user_id = $1
    `,
    create: `
        WITH created_person AS (
            INSERT INTO business.person (person_ci, person_na, person_ln, person_ph, person_deg)
            VALUES ($7, $8, $9, $10, $11)
            RETURNING person_id, person_ci, person_na, person_ln, person_ph, person_deg
        ),
        created_user AS (
            INSERT INTO security."user" (
                user_na,
                user_pw,
                user_act,
                user_em,
                user_em_verified_dt,
                user_sol,
                person_id
            )
            SELECT
                $1,
                $2,
                COALESCE($3, true),
                $4,
                $5,
                COALESCE($6, true),
                cp.person_id
            FROM created_person cp
            RETURNING *
        )
        SELECT
            cu.user_id,
            cu.user_na,
            cu.user_pw,
            cu.user_act,
            cu.user_created_dt,
            cu.user_updated_dt,
            cu.user_last_login_dt,
            cu.user_em,
            cu.user_em_verified_dt,
            cu.user_sol,
            cu.person_id,
            cp.person_ci,
            cp.person_na,
            cp.person_ln,
            cp.person_ph,
            cp.person_deg
        FROM created_user cu
        LEFT JOIN created_person cp ON cp.person_id = cu.person_id
    `,
    update: `
        WITH updated_user AS (
            UPDATE security."user"
            SET
                user_na = COALESCE($2, user_na),
                user_pw = COALESCE($3, user_pw),
                user_act = COALESCE($4, user_act),
                user_em = COALESCE($5, user_em),
                user_em_verified_dt = COALESCE($6, user_em_verified_dt),
                user_sol = COALESCE($7, user_sol)
            WHERE user_id = $1
            RETURNING *
        ),
        updated_person AS (
            UPDATE business.person p
            SET
                person_ci = COALESCE($8, person_ci),
                person_na = COALESCE($9, person_na),
                person_ln = COALESCE($10, person_ln),
                person_ph = COALESCE($11, person_ph),
                person_deg = COALESCE($12, person_deg)
            FROM updated_user uu
            WHERE p.person_id = uu.person_id
            RETURNING p.*
        )
        SELECT
            uu.user_id,
            uu.user_na,
            uu.user_pw,
            uu.user_act,
            uu.user_created_dt,
            uu.user_updated_dt,
            uu.user_last_login_dt,
            uu.user_em,
            uu.user_em_verified_dt,
            uu.user_sol,
            uu.person_id,
            p.person_ci,
            p.person_na,
            p.person_ln,
            p.person_ph,
            p.person_deg
        FROM updated_user uu
        LEFT JOIN business.person p ON p.person_id = uu.person_id
    `,
    delete: `
        WITH deleted_user AS (
            DELETE FROM security."user"
            WHERE user_id = $1
            RETURNING person_id
        ),
        deleted_person AS (
            DELETE FROM business.person p
            USING deleted_user du
            WHERE p.person_id = du.person_id
            RETURNING p.person_id
        )
        SELECT 1 FROM deleted_user
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM security."user" WHERE user_id = $1) as "exists"
    `,
} as const

export type UserQueryKey = keyof typeof UserQueries
