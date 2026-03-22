export const LapseQueries = {
    findAll: `
        SELECT * FROM business.lapse
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
} as const

export type LapseQueryKey = keyof typeof LapseQueries
