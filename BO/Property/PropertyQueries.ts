export const PropertyQueries = {
    findAll: `
        SELECT * FROM property
    `,
    findById: `
        SELECT * FROM property WHERE id = $1
    `,
    create: `
        INSERT INTO property (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE property SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM property WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM property WHERE id = $1) as "exists"
    `,
} as const

export type PropertyQueryKey = keyof typeof PropertyQueries
