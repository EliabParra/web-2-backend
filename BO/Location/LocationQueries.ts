export const LocationQueries = {
    findAll: `
        SELECT * FROM business.location
    `,
    findById: `
        SELECT * FROM business.location WHERE location_id = $1
    `,
    create: `
        INSERT INTO business.location (location_de, location_sh, location_dr) VALUES ($1, $2, $3) RETURNING *
    `,
    update: `
        UPDATE business.location SET location_de = $2, location_sh = $3, location_dr = $4 WHERE location_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM business.location WHERE location_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM business.location WHERE location_id = $1) as "exists"
    `,
} as const

export type LocationQueryKey = keyof typeof LocationQueries
