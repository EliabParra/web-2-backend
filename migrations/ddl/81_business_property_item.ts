/**
 * Auto-generated schema for business.property_item
 * Generated at: 2026-03-24T23:05:33.593Z
 */
export const PROPERTY_ITEM_SCHEMA = [
    // Table Definition
    `create table if not exists business.property_item (
        property_item_id serial primary key,
        property_item_de text not null,
        property_id integer not null,
        item_id integer not null,
        foreign key (property_id) references business.property (property_id),
        foreign key (item_id) references business.item (item_id)
    );`,
]
