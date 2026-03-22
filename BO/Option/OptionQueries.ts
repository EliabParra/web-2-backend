export const OptionQueries = {
    findAll: `
        SELECT * FROM security.option
    `,
    findById: `
        SELECT * FROM security.option WHERE option_id = $1
    `,
    create: `
        INSERT INTO security.option (option_na, method_id) VALUES ($1, $2) RETURNING *
    `,
    update: `
        UPDATE security.option SET option_na = $2, method_id = $3 WHERE option_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM security.option WHERE option_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM security.option WHERE option_id = $1) as "exists"
    `,
} as const

export type OptionQueryKey = keyof typeof OptionQueries
