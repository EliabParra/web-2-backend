export const ReportQueries = {
    findAll: `
        SELECT * FROM report
    `,
    findById: `
        SELECT * FROM report WHERE id = $1
    `,
    create: `
        INSERT INTO report (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE report SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM report WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM report WHERE id = $1) as "exists"
    `,
} as const

export type ReportQueryKey = keyof typeof ReportQueries
