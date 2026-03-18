export const ComponentQueries = {
    findAll: `
        SELECT * FROM component
    `,
    findById: `
        SELECT * FROM component WHERE id = $1
    `,
    create: `
        INSERT INTO component (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE component SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM component WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM component WHERE id = $1) as "exists"
    `,
} as const

export type ComponentQueryKey = keyof typeof ComponentQueries
