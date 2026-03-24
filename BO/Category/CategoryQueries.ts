export const CategoryQueries = {
    findAll: `
        SELECT *
        FROM business.category
        WHERE ($1::text IS NULL OR LOWER(category_de) LIKE ('%' || LOWER($1) || '%'))
            AND ($2::int IS NULL OR category_type_id = $2)
        ORDER BY category_id DESC
    `,
    findById: `
        SELECT * FROM business.category WHERE category_id = $1
    `,
    create: `
        INSERT INTO business.category (category_de, category_type_id) VALUES ($1, $2) RETURNING *
    `,
    update: `
        UPDATE business.category SET category_de = $2, category_type_id = $3 WHERE category_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM business.category WHERE category_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM business.category WHERE category_id = $1) as "exists"
    `,
} as const

export type CategoryQueryKey = keyof typeof CategoryQueries
