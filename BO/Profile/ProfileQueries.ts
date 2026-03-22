export const ProfileQueries = {
    findAll: `
        SELECT * FROM profile
    `,
    findById: `
        SELECT * FROM profile WHERE id = $1
    `,
    create: `
        INSERT INTO profile (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE profile SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM profile WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM profile WHERE id = $1) as "exists"
    `,
} as const

export type ProfileQueryKey = keyof typeof ProfileQueries
