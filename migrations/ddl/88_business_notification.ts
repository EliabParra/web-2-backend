/**
 * Schema for business.notification
 * Notificaciones de negocio asociadas a usuarios.
 */
export const NOTIFICATION_SCHEMA = [
    // Table Definition
    `create table if not exists business.notification (
        notification_id serial primary key,
        notification_ty varchar(50),
        notification_tit text,
        notification_msg text,
        notification_dt timestamp with time zone not null default now(),
        user_id bigint not null,
        foreign key (user_id) references security.user (user_id)
    );`,
]
