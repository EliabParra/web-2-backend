/**
 * Auto-generated schema for business.property
 * Generated at: 2026-03-02T23:53:41.533Z
 */
export const PROPERTY_SCHEMA = [
    // Table Definition
    `create table if not exists business.property (
        property_id serial primary key,
        property_description text not null,
        property_value integer not null
    );`,
]
