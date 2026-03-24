export const EquipmentQueries = {
    findAll: `
        SELECT i.*
        FROM business.item i
        INNER JOIN business.category c ON c.category_id = i.category_id
        WHERE c.category_type_id = 1
          AND ($1::int IS NULL OR i.item_cod = $1)
          AND ($2::text IS NULL OR LOWER(i.item_na) LIKE ('%' || LOWER($2) || '%'))
          AND ($3::int IS NULL OR i.category_id = $3)
        ORDER BY i.item_id DESC
    `,
    findById: `
        SELECT i.*
        FROM business.item i
        INNER JOIN business.category c ON c.category_id = i.category_id
        WHERE i.item_id = $1
        AND c.category_type_id = 1
    `,
    create: `
        INSERT INTO business.item (item_cod, item_na, category_id)
        SELECT $1, $2, $3
        WHERE EXISTS (
            SELECT 1
            FROM business.category c
            WHERE c.category_id = $3
            AND c.category_type_id = 1
        )
        RETURNING *
    `,
    update: `
        UPDATE business.item i
        SET item_cod = $2,
            item_na = $3,
            category_id = $4
        WHERE i.item_id = $1
        AND EXISTS (
            SELECT 1
            FROM business.category current_c
            WHERE current_c.category_id = i.category_id
            AND current_c.category_type_id = 1
        )
        AND EXISTS (
            SELECT 1
            FROM business.category new_c
            WHERE new_c.category_id = $4
            AND new_c.category_type_id = 1
        )
        RETURNING *
    `,
    delete: `
        DELETE FROM business.item i
        WHERE i.item_id = $1
        AND EXISTS (
            SELECT 1
            FROM business.category c
            WHERE c.category_id = i.category_id
            AND c.category_type_id = 1
        )
    `,
    exists: `
        SELECT EXISTS(
            SELECT 1
            FROM business.item i
            INNER JOIN business.category c ON c.category_id = i.category_id
            WHERE i.item_id = $1
            AND c.category_type_id = 1
        ) as "exists"
    `,
} as const

export type EquipmentQueryKey = keyof typeof EquipmentQueries
