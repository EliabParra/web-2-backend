/**
 * Auto-generated data for business.category_type
 * Generated at: 2026-03-24T23:05:33.396Z
 */
export const DATA_CATEGORY_TYPE_SCHEMA = [
    `INSERT INTO business.category_type (category_type_id, category_type_de) VALUES (1, 'Equipo') ON CONFLICT (category_type_id) DO UPDATE SET category_type_de = EXCLUDED.category_type_de;`,
    `INSERT INTO business.category_type (category_type_id, category_type_de) VALUES (2, 'Componente') ON CONFLICT (category_type_id) DO UPDATE SET category_type_de = EXCLUDED.category_type_de;`,
]
