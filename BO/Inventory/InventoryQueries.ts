export const InventoryQueries = {
    findAll: `
        SELECT * FROM inventory
    `,
    findById: `
        SELECT * FROM inventory WHERE id = $1
    `,
    create: `
        INSERT INTO inventory (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE inventory SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM inventory WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM inventory WHERE id = $1) as "exists"
    `,
} as const

export type InventoryQueryKey = keyof typeof InventoryQueries
