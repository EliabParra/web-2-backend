/**
 * Auto-generated schema for business.devolution_status
 * Generated at: 2026-03-18T02:22:46.414Z
 */
export const DEVOLUTION_STATUS_SCHEMA = [
    // Table Definition
    `create table if not exists business.devolution_status (
        devolution_status_id serial primary key,
        devolution_status_dt timestamp with time zone,
        devolution_status_de text,
        devolution_status_ob text,
        movement_detail_id integer not null,
        foreign key (movement_detail_id) references business.movement_detail (movement_detail_id)
    );`,
]
