export const MenuQueries = {
    findAll: `
        SELECT * FROM menu
    `,
    findById: `
        SELECT * FROM menu WHERE id = $1
    `,
    create: `
        INSERT INTO menu (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE menu SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM menu WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM menu WHERE id = $1) as "exists"
    `,
} as const

export type MenuQueryKey = keyof typeof MenuQueries
