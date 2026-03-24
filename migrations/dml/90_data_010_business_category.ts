/**
 * Auto-generated data for business.category
 * Generated at: 2026-03-23T19:05:33.732Z
 */
export const DATA_CATEGORY_SCHEMA = [
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (1, 'Activo', 2) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (2, 'Pasivo', 2) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (3, 'Opto-electrónico', 2) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (4, 'Electromagnético', 2) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (5, 'Electroacústico', 2) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (6, 'Conectores', 2) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (7, 'Medición', 1) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (8, 'Generación', 1) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (9, 'Analógico', 1) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
    `INSERT INTO business.category (category_id, category_de, category_type_id) VALUES (10, 'Digital', 1) ON CONFLICT (category_id) DO UPDATE SET category_de = EXCLUDED.category_de, category_type_id = EXCLUDED.category_type_id;`,
]
