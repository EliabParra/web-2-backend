export const LoanQueries = {
    findAll: `
        SELECT * FROM loan
    `,
    findById: `
        SELECT * FROM loan WHERE id = $1
    `,
    create: `
        INSERT INTO loan (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE loan SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM loan WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM loan WHERE id = $1) as "exists"
    `,
} as const

export type LoanQueryKey = keyof typeof LoanQueries
