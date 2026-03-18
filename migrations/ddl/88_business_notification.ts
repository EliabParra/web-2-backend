/**
 * Auto-generated schema for business.notification
 * Generated at: 2026-03-18T02:22:46.235Z
 */
export const NOTIFICATION_SCHEMA = [
    // Table Definition
    `create table if not exists business.notification (
        notification_id serial primary key,
        notification_ty character varying,
        notification_tit text,
        notification_msg text,
        notification_dt timestamp with time zone not null default now(),
        user_id bigint not null
    );`,
]
