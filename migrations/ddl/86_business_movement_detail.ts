/**
 * Schema for business.movement_detail
 * Detalle de cada movimiento vinculado a inventario.
 */
export const MOVEMENT_DETAIL_SCHEMA = [
    // Table Definition
    `create table if not exists business.movement_detail (
        movement_detail_id serial primary key,
        movement_detail_dt timestamp with time zone,
        movement_detail_am integer not null,
        movement_detail_ob text,
        inventory_id integer not null,
        movement_id integer not null,
        foreign key (inventory_id) references business.inventory (inventory_id),
        foreign key (movement_id) references business.movement (movement_id)
    );`,
]
