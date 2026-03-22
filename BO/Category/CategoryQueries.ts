export const CategoryQueries = {
    findAll: `
        SELECT * FROM category
    `,
    findById: `
        SELECT * FROM category WHERE id = $1
    `,
    create: `
        INSERT INTO category (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE category SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM category WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM category WHERE id = $1) as "exists"
    `,
} as const

export type CategoryQueryKey = keyof typeof CategoryQueries
