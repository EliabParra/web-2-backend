/**
 * Phase 4: Business Foundation
 * Core business tables: persons, groups, group_person.
 * Tables are PLURAL with LONG column names (base state for naming migration).
 *
 * TODO(REVERT_NAMING): This file represents the original schema state.
 */
export const BUSINESS_BASE_SCHEMA = [
    `CREATE SCHEMA IF NOT EXISTS business;`,

    `CREATE TABLE IF NOT EXISTS business.persons (
        person_id SERIAL PRIMARY KEY,
        person_ci TEXT,
        person_name TEXT,
        person_lastname TEXT,
        person_phone TEXT,
        person_degree TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS business.groups (
        group_id SERIAL PRIMARY KEY,
        group_name TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS business.group_person (
        group_person_id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES business.groups(group_id),
        person_id INTEGER REFERENCES business.persons(person_id)
    );`,
]
