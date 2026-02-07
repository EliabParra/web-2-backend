/**
 * Auto-generated data for security.objects (Propagated from Legacy)
 */
export const DATA_OBJECTS_SCHEMA = [
    `INSERT INTO security.objects (object_id, object_name) VALUES ('1', 'Auth') ON CONFLICT (object_id) DO UPDATE SET object_name = EXCLUDED.object_name;`,
]
