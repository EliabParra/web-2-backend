/**
 * Schema for business.movement_type
 * Catálogo de tipos de movimiento (préstamo, devolución, etc).
 */
export const MOVEMENT_TYPE_SCHEMA = [
    // Table Definition
    `create table if not exists business.movement_type (
        movement_type_id serial primary key,
        movement_type_de text not null
    );`,
]
