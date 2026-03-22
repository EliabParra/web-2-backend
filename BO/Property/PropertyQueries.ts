export const PropertyQueries = {
    findAll: `
        SELECT * FROM business.property
    `,
    findById: `
        SELECT * FROM business.property WHERE property_id = $1
    `,
    create: `
        INSERT INTO business.property (property_de, property_val) VALUES ($1, $2) RETURNING *
    `,
    update: `
        UPDATE business.property SET property_de = $2, property_val = $3 WHERE property_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM business.property WHERE property_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM business.property WHERE property_id = $1) as "exists"
    `,
} as const

export type PropertyQueryKey = keyof typeof PropertyQueries
