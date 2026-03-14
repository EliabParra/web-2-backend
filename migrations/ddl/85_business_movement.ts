/**
 * Schema for business.movement
 * Movimientos de inventario con referencias a usuario, tipo y lapso.
 */
export const MOVEMENT_SCHEMA = [
    // Table Definition
    `create table if not exists business.movement (
        movement_id serial primary key,
        movement_booking_dt timestamp with time zone,
        movement_estimated_return_dt timestamp with time zone,
        movement_ob text,
        user_id bigint not null,
        movement_type_id integer not null,
        lapse_id integer not null,
        foreign key (user_id) references security.user (user_id),
        foreign key (movement_type_id) references business.movement_type (movement_type_id),
        foreign key (lapse_id) references business.lapse (lapse_id)
    );`,
]
