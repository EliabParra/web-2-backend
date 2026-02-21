/**
 * Auto-generated data for public._migration_history
 * Generated at: 2026-02-21T19:22:09.947Z
 */
export const DATA__MIGRATION_HISTORY_SCHEMA = [
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (1, '01_core_security_base.ts', '2026-02-21T18:37:58.745Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (2, '10_schema_security_users_extended.ts', '2026-02-21T18:37:58.848Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (3, '20_schema_security_auth.ts', '2026-02-21T18:37:58.863Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (4, '50_migration_security_refactor_v1.ts', '2026-02-21T18:37:58.899Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (5, '89_schema_security_audit.ts', '2026-02-21T18:37:59.062Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (6, '91_data_security_profiles.ts', '2026-02-21T18:37:59.087Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (7, '92_data_security_objects.ts', '2026-02-21T18:37:59.095Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (8, '93_data_security_users.ts', '2026-02-21T18:37:59.100Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (9, '94_data_security_methods.ts', '2026-02-21T18:37:59.107Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (10, '95_data_security_object_method.ts', '2026-02-21T18:37:59.118Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (11, '96_data_security_profile_method.ts', '2026-02-21T18:37:59.131Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (12, '98_data_security_user_profile.ts', '2026-02-21T18:37:59.145Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (13, '99_reset_sequences.ts', '2026-02-21T18:37:59.151Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
]
