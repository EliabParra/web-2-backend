export const ObjectQueries = {
    findAll: `
        SELECT * FROM security.object
    `,
    findById: `
        SELECT * FROM security.object WHERE object_id = $1
    `,
    create: `
        INSERT INTO security.object (object_na) VALUES ($1) RETURNING *
    `,
    update: `
        UPDATE security.object SET object_na = $2 WHERE object_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM security.object WHERE object_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM security.object WHERE object_id = $1) as "exists"
    `,
} as const

export type ObjectQueryKey = keyof typeof ObjectQueries
