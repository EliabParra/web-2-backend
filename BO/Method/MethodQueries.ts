export const MethodQueries = {
    findAll: `
        SELECT * FROM security.method
    `,
    findById: `
        SELECT * FROM security.method WHERE method_id = $1
    `,
    create: `
        INSERT INTO security.method (method_na) VALUES ($1) RETURNING *
    `,
    update: `
        UPDATE security.method SET method_na = $2 WHERE method_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM security.method WHERE method_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM security.method WHERE method_id = $1) as "exists"
    `,
} as const

export type MethodQueryKey = keyof typeof MethodQueries
