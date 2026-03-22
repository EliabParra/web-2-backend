export const LapseQueries = {
    findAll: `
        SELECT * FROM lapse
    `,
    findById: `
        SELECT * FROM lapse WHERE id = $1
    `,
    create: `
        INSERT INTO lapse (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE lapse SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM lapse WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM lapse WHERE id = $1) as "exists"
    `,
} as const

export type LapseQueryKey = keyof typeof LapseQueries
