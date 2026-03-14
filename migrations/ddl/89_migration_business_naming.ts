/**
 * Migration: Business Schema Column Naming Convention
 * Renames columns to follow mnemotechnic convention: <table>_<abbreviation>
 * 
 * TODO(REVERT_NAMING): This entire file can be removed to revert naming changes.
 * To fully revert, create a new migration reversing each ALTER TABLE RENAME below.
 */
export const BUSINESS_NAMING_SCHEMA = [
    // business.category_type
    `ALTER TABLE business.category_type RENAME COLUMN category_type_description TO category_type_de;`,

    // business.location
    `ALTER TABLE business.location RENAME COLUMN location_description TO location_de;`,
    `ALTER TABLE business.location RENAME COLUMN location_shelf TO location_sh;`,
    `ALTER TABLE business.location RENAME COLUMN location_drawer TO location_dr;`,

    // business.property
    `ALTER TABLE business.property RENAME COLUMN property_description TO property_de;`,
    `ALTER TABLE business.property RENAME COLUMN property_value TO property_val;`,

    // business.category
    `ALTER TABLE business.category RENAME COLUMN category_description TO category_de;`,

    // business.item
    `ALTER TABLE business.item RENAME COLUMN item_code TO item_cod;`,
    `ALTER TABLE business.item RENAME COLUMN item_name TO item_na;`,

    // business.property_item
    `ALTER TABLE business.property_item RENAME COLUMN property_item_description TO property_item_de;`,

    // business.inventory
    `ALTER TABLE business.inventory RENAME COLUMN inventory_quantity TO inventory_qt;`,
    `ALTER TABLE business.inventory RENAME COLUMN inventory_updated_at TO inventory_updated_dt;`,
]
