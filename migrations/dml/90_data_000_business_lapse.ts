/**
 * Auto-generated data for business.lapse
 * Generated at: 2026-03-24T23:05:33.426Z
 */
export const DATA_LAPSE_SCHEMA = [
    `INSERT INTO business.lapse (lapse_id, lapse_de, lapse_act, lapse_start_dt, lapse_close_dt) VALUES (1, '2026A', TRUE, '2026-01-19T04:00:00.000Z', '2026-04-21T04:00:00.000Z') ON CONFLICT (lapse_id) DO UPDATE SET lapse_de = EXCLUDED.lapse_de, lapse_act = EXCLUDED.lapse_act, lapse_start_dt = EXCLUDED.lapse_start_dt, lapse_close_dt = EXCLUDED.lapse_close_dt;`,
]
