export const ObjectQueries = {
    findAll: `
        SELECT * FROM object
    `,
    findById: `
        SELECT * FROM object WHERE id = $1
    `,
    create: `
        INSERT INTO object (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE object SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM object WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM object WHERE id = $1) as "exists"
    `,
} as const

export type ObjectQueryKey = keyof typeof ObjectQueries
