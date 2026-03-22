export const DevolutionQueries = {
    findAll: `
        SELECT * FROM devolution
    `,
    findById: `
        SELECT * FROM devolution WHERE id = $1
    `,
    create: `
        INSERT INTO devolution (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE devolution SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM devolution WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM devolution WHERE id = $1) as "exists"
    `,
} as const

export type DevolutionQueryKey = keyof typeof DevolutionQueries
