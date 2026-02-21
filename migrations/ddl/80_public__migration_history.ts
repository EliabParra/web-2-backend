/**
 * Auto-generated schema for public._migration_history
 * Generated at: 2026-02-21T19:22:09.948Z
 */
export const _MIGRATION_HISTORY_SCHEMA = [
    // Table Definition
    `create table if not exists public._migration_history (
        id integer not null default nextval('_migration_history_id_seq'::regclass),
        filename character varying not null,
        applied_at timestamp with time zone default CURRENT_TIMESTAMP
    );`,

    // Indexes
    `CREATE UNIQUE INDEX _migration_history_filename_key ON public._migration_history USING btree (filename);`, 
    `CREATE UNIQUE INDEX _migration_history_pkey ON public._migration_history USING btree (id);`, 
]
