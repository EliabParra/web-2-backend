export const MethodQueries = {
    findAll: `
        SELECT * FROM method
    `,
    findById: `
        SELECT * FROM method WHERE id = $1
    `,
    create: `
        INSERT INTO method (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE method SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM method WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM method WHERE id = $1) as "exists"
    `,
} as const

export type MethodQueryKey = keyof typeof MethodQueries
