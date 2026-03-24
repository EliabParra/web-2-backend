/**
 * Auto-generated schema for business.item
 * Generated at: 2026-03-23T19:05:33.750Z
 */
export const ITEM_SCHEMA = [
    // Table Definition
    `create table if not exists business.item (
        item_id serial primary key,
        item_cod integer not null,
        item_na text not null,
        category_id integer not null,
        foreign key (category_id) references business.category (category_id)
    );`,
]
