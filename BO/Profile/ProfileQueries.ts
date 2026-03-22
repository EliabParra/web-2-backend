export const ProfileQueries = {
    findAll: `
        SELECT * FROM security.profile
    `,
    findById: `
        SELECT * FROM security.profile WHERE profile_id = $1
    `,
    create: `
        INSERT INTO security.profile (profile_na) VALUES ($1) RETURNING *
    `,
    update: `
        UPDATE security.profile SET profile_na = $2 WHERE profile_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM security.profile WHERE profile_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM security.profile WHERE profile_id = $1) as "exists"
    `,
} as const

export type ProfileQueryKey = keyof typeof ProfileQueries
