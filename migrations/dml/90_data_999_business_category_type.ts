/**
 * Auto-generated data for business.category_type
 * Generated at: 2026-03-03T13:15:16.084Z
 */
export const DATA_CATEGORY_TYPE_SCHEMA = [
    `INSERT INTO business.category_type (category_type_id, category_type_description) VALUES (1, 'Equipo') ON CONFLICT (category_type_id) DO UPDATE SET category_type_description = EXCLUDED.category_type_description;`,
    `INSERT INTO business.category_type (category_type_id, category_type_description) VALUES (2, 'Componente') ON CONFLICT (category_type_id) DO UPDATE SET category_type_description = EXCLUDED.category_type_description;`,
]
