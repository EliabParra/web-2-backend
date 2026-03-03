/**
 * Auto-generated schema for business.inventory
 * Generated at: 2026-03-03T14:45:25.115Z
 */
export const INVENTORY_SCHEMA = [
    // Table Definition
    `create table if not exists business.inventory (
        inventory_id serial primary key,
        inventory_quantity integer not null,
        inventory_updated_at timestamp with time zone not null default now(),
        location_id integer not null,
        item_id integer not null,
        foreign key (location_id) references business.location (location_id),
        foreign key (item_id) references business.item (item_id)
    );`,
]
