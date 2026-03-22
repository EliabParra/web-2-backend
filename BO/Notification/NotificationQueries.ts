export const NotificationQueries = {
    findAll: `
        SELECT * FROM notification
    `,
    findById: `
        SELECT * FROM notification WHERE id = $1
    `,
    create: `
        INSERT INTO notification (created_at) VALUES (NOW()) RETURNING *
    `,
    update: `
        UPDATE notification SET updated_at = NOW() WHERE id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM notification WHERE id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM notification WHERE id = $1) as "exists"
    `,
} as const

export type NotificationQueryKey = keyof typeof NotificationQueries
