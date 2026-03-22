export const GroupQueries = {
    findAll: `
        SELECT * FROM group
    `,
    findById: `
        SELECT * FROM group WHERE id = $1
    `,
    create: `
        INSERT INTO group (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE group SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM group WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM group WHERE id = $1) as "exists"
    `,
} as const

export type GroupQueryKey = keyof typeof GroupQueries
