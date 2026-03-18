export const LocationQueries = {
    findAll: `
        SELECT * FROM location
    `,
    findById: `
        SELECT * FROM location WHERE id = $1
    `,
    create: `
        INSERT INTO location (location_de, location_sh, location_dr) VALUES ($1, $2, $3) RETURNING *
    `,
    update: `
        UPDATE location SET location_de = $2, location_sh = $3, location_dr = $4 WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM location WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM location WHERE id = $1) as "exists"
    `,
} as const

export type LocationQueryKey = keyof typeof LocationQueries
