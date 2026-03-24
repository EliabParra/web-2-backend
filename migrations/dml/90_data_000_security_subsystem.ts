/**
 * Auto-generated data for security.subsystem
 * Generated at: 2026-03-24T23:05:33.522Z
 */
export const DATA_SUBSYSTEM_SCHEMA = [
    `INSERT INTO security.subsystem (subsystem_id, subsystem_na) VALUES (1, 'Seguridad') ON CONFLICT (subsystem_id) DO UPDATE SET subsystem_na = EXCLUDED.subsystem_na;`,
    `INSERT INTO security.subsystem (subsystem_id, subsystem_na) VALUES (2, 'Control de Inventario') ON CONFLICT (subsystem_id) DO UPDATE SET subsystem_na = EXCLUDED.subsystem_na;`,
]
