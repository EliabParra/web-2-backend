export const LapseQueries = {
    findAll: `
                SELECT *
                FROM business.lapse
                WHERE ($1::text IS NULL OR LOWER(lapse_de) LIKE ('%' || LOWER($1) || '%'))
                    AND ($2::boolean IS NULL OR lapse_act = $2)
                    AND ($3::date IS NULL OR lapse_start_dt >= $3)
                    AND ($4::date IS NULL OR lapse_close_dt <= $4)
                ORDER BY lapse_start_dt DESC NULLS LAST, lapse_id DESC
    `,
    findById: `
        SELECT * FROM business.lapse WHERE lapse_id = $1
    `,
    create: `
        INSERT INTO business.lapse (lapse_de, lapse_act, lapse_start_dt, lapse_close_dt) VALUES ($1, $2, $3, $4) RETURNING *
    `,
    update: `
        UPDATE business.lapse SET lapse_de = $2, lapse_act = $3, lapse_start_dt = $4, lapse_close_dt = $5 WHERE lapse_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM business.lapse WHERE lapse_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM business.lapse WHERE lapse_id = $1) as "exists"
    `,
    syncActiveByDate: `
        WITH active_candidate AS (
            SELECT lapse_id
            FROM business.lapse
            WHERE (lapse_start_dt IS NULL OR lapse_start_dt <= CURRENT_DATE)
              AND (lapse_close_dt IS NULL OR lapse_close_dt >= CURRENT_DATE)
            ORDER BY lapse_start_dt DESC NULLS LAST, lapse_id DESC
            LIMIT 1
        )
        UPDATE business.lapse l
        SET lapse_act = EXISTS (
            SELECT 1
            FROM active_candidate c
            WHERE c.lapse_id = l.lapse_id
        )
    `,
} as const

export type LapseQueryKey = keyof typeof LapseQueries
