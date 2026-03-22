export const MenuQueries = {
    findAll: `
        SELECT * FROM security.menu
    `,
    findById: `
        SELECT * FROM security.menu WHERE menu_id = $1
    `,
    create: `
        INSERT INTO security.menu (menu_na, subsystem_id) VALUES ($1, $2) RETURNING *
    `,
    update: `
        UPDATE security.menu SET menu_na = $2, subsystem_id = $3 WHERE menu_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM security.menu WHERE menu_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM security.menu WHERE menu_id = $1) as "exists"
    `,
} as const

export type MenuQueryKey = keyof typeof MenuQueries
