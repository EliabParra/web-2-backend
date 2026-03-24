/**
 * Auto-generated data for business.item
 * Generated at: 2026-03-23T19:05:33.750Z
 */
export const DATA_ITEM_SCHEMA = [
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (1, 1, 'Resistencia', 2) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (3, 3, 'Inductor', 2) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (4, 4, 'Diodo', 1) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (6, 6, 'Condensador cerámico', 2) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (2, 2, 'Condensador electrólítico', 2) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (5, 5, 'Transistor FET', 1) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (7, 7, 'Transistor BJT', 1) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (8, 8, 'Transistor MOSFET', 1) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (9, 9, 'Diodo Zener', 1) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (10, 10, 'Varicap', 1) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (11, 11, 'Fotodiodo', 1) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (12, 12, 'Multímetro', 7) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (13, 13, 'Multímetro', 7) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (14, 14, 'Multímetro', 7) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (15, 15, 'Generador de Señales', 8) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (16, 16, 'Generador de Señales', 8) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (17, 17, 'Generador de Señales', 8) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (18, 18, 'Fuente de Poder', 8) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (19, 19, 'Fuente de Poder', 8) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (20, 20, 'Fuente de Poder', 8) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (21, 21, 'Fuente de Poder', 8) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (22, 22, 'Osciloscopio', 7) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (23, 23, 'Osciloscopio', 7) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (24, 24, 'Osciloscopio', 7) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
    `INSERT INTO business.item (item_id, item_cod, item_na, category_id) VALUES (25, 25, 'Osciloscopio', 7) ON CONFLICT (item_id) DO UPDATE SET item_cod = EXCLUDED.item_cod, item_na = EXCLUDED.item_na, category_id = EXCLUDED.category_id;`,
]
