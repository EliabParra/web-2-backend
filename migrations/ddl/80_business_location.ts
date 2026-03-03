/**
 * Auto-generated schema for business.location
 * Generated at: 2026-03-03T14:45:24.866Z
 */
export const LOCATION_SCHEMA = [
    // Table Definition
    `create table if not exists business.location (
        location_id serial primary key,
        location_description text not null,
        location_shelf integer not null,
        location_drawer integer not null
    );`,
]
