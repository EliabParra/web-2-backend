/**
 * Auto-generated data for business.movement_type
 * Generated at: 2026-03-24T23:05:33.456Z
 */
export const DATA_MOVEMENT_TYPE_SCHEMA = [
    `INSERT INTO business.movement_type (movement_type_id, movement_type_de) VALUES (1, 'Solicitado') ON CONFLICT (movement_type_id) DO UPDATE SET movement_type_de = EXCLUDED.movement_type_de;`,
    `INSERT INTO business.movement_type (movement_type_id, movement_type_de) VALUES (2, 'Aceptado') ON CONFLICT (movement_type_id) DO UPDATE SET movement_type_de = EXCLUDED.movement_type_de;`,
    `INSERT INTO business.movement_type (movement_type_id, movement_type_de) VALUES (3, 'Rechazado') ON CONFLICT (movement_type_id) DO UPDATE SET movement_type_de = EXCLUDED.movement_type_de;`,
    `INSERT INTO business.movement_type (movement_type_id, movement_type_de) VALUES (4, 'Prestado') ON CONFLICT (movement_type_id) DO UPDATE SET movement_type_de = EXCLUDED.movement_type_de;`,
    `INSERT INTO business.movement_type (movement_type_id, movement_type_de) VALUES (5, 'Devuelto') ON CONFLICT (movement_type_id) DO UPDATE SET movement_type_de = EXCLUDED.movement_type_de;`,
]
