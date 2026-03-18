/**
 * Auto-generated schema for business.property
 * Generated at: 2026-03-18T02:22:46.272Z
 */
export const PROPERTY_SCHEMA = [
    // Table Definition
    `create table if not exists business.property (
        property_id serial primary key,
        property_de text not null,
        property_val integer not null
    );`,
]
