/**
 * Auto-generated schema for business.person
 * Generated at: 2026-03-24T23:05:33.485Z
 */
export const PERSON_SCHEMA = [
    // Table Definition
    `create table if not exists business.person (
        person_id serial primary key,
        person_ci text,
        person_na text,
        person_ln text,
        person_ph text,
        person_deg text
    );`,
]
