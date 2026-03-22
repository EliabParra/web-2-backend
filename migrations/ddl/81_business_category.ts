/**
 * Auto-generated schema for business.category
 * Generated at: 2026-03-22T23:55:31.661Z
 */
export const CATEGORY_SCHEMA = [
    // Table Definition
    `create table if not exists business.category (
        category_id serial primary key,
        category_de text not null,
        category_type_id integer not null,
        foreign key (category_type_id) references business.category_type (category_type_id)
    );`,
]
