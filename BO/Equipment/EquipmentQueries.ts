export const EquipmentQueries = {
    findAll: `
        SELECT * FROM equipment
    `,
    findById: `
        SELECT * FROM equipment WHERE id = $1
    `,
    create: `
        INSERT INTO equipment (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE equipment SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM equipment WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM equipment WHERE id = $1) as "exists"
    `,
} as const

export type EquipmentQueryKey = keyof typeof EquipmentQueries
