export const UserQueries = {
    findAll: `
        SELECT * FROM user
    `,
    findById: `
        SELECT * FROM user WHERE id = $1
    `,
    create: `
        INSERT INTO user (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE user SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM user WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM user WHERE id = $1) as "exists"
    `,
} as const

export type UserQueryKey = keyof typeof UserQueries
