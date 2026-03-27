/**
 * Adds persisted read state for notifications.
 */
export const NOTIFICATION_READ_SCHEMA = [
    `ALTER TABLE business.notification
     ADD COLUMN IF NOT EXISTS notification_read boolean NOT NULL DEFAULT false;`,
    `CREATE INDEX IF NOT EXISTS idx_notification_user_read_dt
     ON business.notification (user_id, notification_read, notification_dt DESC);`,
]
