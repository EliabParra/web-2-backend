/**
 * Auto-generated schema for business.location
 * Generated at: 2026-03-24T23:05:33.442Z
 */
export const LOCATION_SCHEMA = [
    // Table Definition
    `create table if not exists business.location (
        location_id serial primary key,
        location_de text not null,
        location_sh integer not null,
        location_dr integer not null
    );`,
]
