/**
 * Auto-generated data for security.objects
 * Generated at: 2026-02-20T10:28:05.104Z
 */
export const DATA_OBJECTS_SCHEMA = [
    `INSERT INTO security.objects (object_id, object_name) VALUES ('1', 'Auth') ON CONFLICT (object_id) DO UPDATE SET object_name = EXCLUDED.object_name;`,
    `INSERT INTO security.objects (object_id, object_name) VALUES ('3', 'Notification') ON CONFLICT (object_id) DO UPDATE SET object_name = EXCLUDED.object_name;`,
]
