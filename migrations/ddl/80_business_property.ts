/**
 * Auto-generated schema for business.property
 * Generated at: 2026-03-02T23:53:41.533Z
 */
export const PROPERTY_SCHEMA = [
    // Table Definition
    `create table if not exists business.property (
        property_id integer not null default nextval('business.property_property_id_seq'::regclass),
        property_description text not null,
        property_value integer not null
    );`,

    // Indexes
    `CREATE UNIQUE INDEX property_pkey ON business.property USING btree (property_id);`, 
]
