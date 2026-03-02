/**
 * Auto-generated data for public._migration_history
 * Generated at: 2026-03-02T23:53:41.544Z
 */
export const DATA__MIGRATION_HISTORY_SCHEMA = [
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (1, '01_core_security_base.ts', '2026-03-02T23:48:32.906Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (2, '10_schema_security_users_extended.ts', '2026-03-02T23:48:32.976Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (3, '20_schema_security_auth.ts', '2026-03-02T23:48:32.998Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (4, '50_migration_security_refactor_v1.ts', '2026-03-02T23:48:33.033Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (5, '89_schema_security_audit.ts', '2026-03-02T23:48:33.147Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (6, '91_data_security_profiles.ts', '2026-03-02T23:48:33.170Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (7, '92_data_security_objects.ts', '2026-03-02T23:48:33.178Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (8, '93_data_security_users.ts', '2026-03-02T23:48:33.185Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (9, '94_data_security_methods.ts', '2026-03-02T23:48:33.194Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (10, '95_data_security_object_method.ts', '2026-03-02T23:48:33.203Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (11, '96_data_security_profile_method.ts', '2026-03-02T23:48:33.212Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (12, '98_data_security_user_profile.ts', '2026-03-02T23:48:33.222Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
    `INSERT INTO public._migration_history (id, filename, applied_at) VALUES (13, '99_reset_sequences.ts', '2026-03-02T23:48:33.230Z') ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, applied_at = EXCLUDED.applied_at;`,
]
