export const NotificationQueries = {
    findAll: `
        SELECT
            n.notification_id,
            n.notification_ty,
            n.notification_tit,
            n.notification_dt,
            n.user_id
        FROM business.notification n
        WHERE ($1::bigint IS NULL OR n.user_id = $1)
          AND ($2::text IS NULL OR LOWER(n.notification_ty) = LOWER($2))
          AND ($3::timestamptz IS NULL OR n.notification_dt >= $3)
          AND ($4::timestamptz IS NULL OR n.notification_dt <= $4)
        ORDER BY n.notification_dt DESC, n.notification_id DESC
        LIMIT $5 OFFSET $6
    `,
    findById: `
        SELECT
            n.notification_id,
            n.notification_ty,
            n.notification_tit,
            n.notification_msg,
            n.notification_dt,
            n.user_id
        FROM business.notification n
        WHERE n.notification_id = $1
    `,
    create: `
        INSERT INTO business.notification (
            notification_ty,
            notification_tit,
            notification_msg,
            user_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
            notification_id,
            notification_ty,
            notification_tit,
            notification_msg,
            notification_dt,
            user_id
    `,
    update: `
        UPDATE business.notification
        SET
            notification_ty = COALESCE($2, notification_ty),
            notification_tit = COALESCE($3, notification_tit),
            notification_msg = COALESCE($4, notification_msg)
        WHERE notification_id = $1
        RETURNING
            notification_id,
            notification_ty,
            notification_tit,
            notification_msg,
            notification_dt,
            user_id
    `,
    delete: `
        DELETE FROM business.notification WHERE notification_id = $1
    `,
    exists: `
        SELECT EXISTS(
            SELECT 1
            FROM business.notification
            WHERE notification_id = $1
        ) as "exists"
    `,
} as const

export type NotificationQueryKey = keyof typeof NotificationQueries
