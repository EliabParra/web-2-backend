export const InventoryQueries = {
    findAll: `
        SELECT
            inv.*,
            i.item_cod,
            i.item_na,
            c.category_type_id,
            l.location_de,
            l.location_sh,
            l.location_dr
        FROM business.inventory inv
        INNER JOIN business.item i ON i.item_id = inv.item_id
        INNER JOIN business.category c ON c.category_id = i.category_id
        INNER JOIN business.location l ON l.location_id = inv.location_id
                WHERE ($1::int IS NULL OR inv.item_id = $1)
                    AND ($2::int IS NULL OR inv.location_id = $2)
                    AND ($3::int IS NULL OR c.category_type_id = $3)
        ORDER BY inv.inventory_id DESC
    `,
    findById: `
        SELECT
            inv.*,
            i.item_cod,
            i.item_na,
            c.category_type_id,
            l.location_de,
            l.location_sh,
            l.location_dr
        FROM business.inventory inv
        INNER JOIN business.item i ON i.item_id = inv.item_id
        INNER JOIN business.category c ON c.category_id = i.category_id
        INNER JOIN business.location l ON l.location_id = inv.location_id
        WHERE inv.inventory_id = $1
    `,
    create: `
        INSERT INTO business.inventory (inventory_qt, location_id, item_id)
        VALUES ($1, $2, $3)
        RETURNING *
    `,
    update: `
        UPDATE business.inventory
        SET
            inventory_qt = COALESCE($2, inventory_qt),
            location_id = COALESCE($3, location_id),
            inventory_updated_dt = NOW()
        WHERE inventory_id = $1
        RETURNING *
    `,
    delete: `
        UPDATE business.inventory
        SET inventory_qt = 0,
            inventory_updated_dt = NOW()
        WHERE inventory_id = $1
        RETURNING *
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM business.inventory WHERE inventory_id = $1) as "exists"
    `,
    findByItemAndLocation: `
        SELECT inv.*
        FROM business.inventory inv
        WHERE inv.item_id = $1 AND inv.location_id = $2
        ORDER BY inv.inventory_id DESC
        LIMIT 1
    `,
    findActiveByItem: `
        SELECT inv.*
        FROM business.inventory inv
        WHERE inv.item_id = $1 AND inv.inventory_qt > 0
        ORDER BY inv.inventory_updated_dt DESC
        LIMIT 1
    `,
    getItemCategoryType: `
        SELECT c.category_type_id
        FROM business.item i
        INNER JOIN business.category c ON c.category_id = i.category_id
        WHERE i.item_id = $1
    `,
} as const

export type InventoryQueryKey = keyof typeof InventoryQueries
