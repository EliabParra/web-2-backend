export const SubsystemQueries = {
    findAll: `
        SELECT * FROM security.subsystem
    `,
    findById: `
        SELECT * FROM security.subsystem WHERE subsystem_id = $1
    `,
    create: `
        INSERT INTO security.subsystem (subsystem_na) VALUES ($1) RETURNING *
    `,
    update: `
        UPDATE security.subsystem SET subsystem_na = $2 WHERE subsystem_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM security.subsystem WHERE subsystem_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM security.subsystem WHERE subsystem_id = $1) as "exists"
    `,
} as const

export type SubsystemQueryKey = keyof typeof SubsystemQueries
