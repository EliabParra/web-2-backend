export const SubsystemQueries = {
    findAll: `
        SELECT * FROM subsystem
    `,
    findById: `
        SELECT * FROM subsystem WHERE id = $1
    `,
    create: `
        INSERT INTO subsystem (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE subsystem SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM subsystem WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM subsystem WHERE id = $1) as "exists"
    `,
} as const

export type SubsystemQueryKey = keyof typeof SubsystemQueries
