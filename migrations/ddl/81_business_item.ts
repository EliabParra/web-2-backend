/**
 * Auto-generated schema for business.item
 * Generated at: 2026-03-03T14:45:25.012Z
 */
export const ITEM_SCHEMA = [
    // Table Definition
    `create table if not exists business.item (
        item_id serial primary key,
        item_code integer not null,
        item_name text not null,
        category_id integer not null,
        foreign key (category_id) references business.category (category_id)
    );`,
]
