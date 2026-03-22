/**
 * Auto-generated schema for business.lapse
 * Generated at: 2026-03-22T21:11:06.301Z
 */
export const LAPSE_SCHEMA = [
    // Table Definition
    `create table if not exists business.lapse (
        lapse_id serial primary key,
        lapse_de text not null,
        lapse_act boolean not null default true,
        lapse_start_dt timestamp with time zone,
        lapse_close_dt timestamp with time zone
    );`,
]
