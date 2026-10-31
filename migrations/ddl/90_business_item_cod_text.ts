/**
 * Item codes become text so labs can use codes like "R-100" or "LM317T".
 * Existing numeric codes are kept as their text form.
 */
export const ITEM_COD_TEXT_SCHEMA = [
    `ALTER TABLE business.item ALTER COLUMN item_cod TYPE varchar(50) USING item_cod::varchar(50);`,
]
