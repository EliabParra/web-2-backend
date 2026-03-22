/**
 * Auto-generated schema for business.property
 * Generated at: 2026-03-22T21:11:06.377Z
 */
export const PROPERTY_SCHEMA = [
    // Table Definition
    `create table if not exists business.property (
        property_id serial primary key,
        property_de text not null,
        property_val integer not null
    );`,
]
