export const OptionQueries = {
    findAll: `
        SELECT * FROM option
    `,
    findById: `
        SELECT * FROM option WHERE id = $1
    `,
    create: `
        INSERT INTO option (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE option SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM option WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM option WHERE id = $1) as "exists"
    `,
} as const

export type OptionQueryKey = keyof typeof OptionQueries
