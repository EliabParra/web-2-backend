/**
 * Reset every serial/identity sequence in the business and security schemas.
 * DML seeds insert rows with explicit IDs; without this the first create on a
 * seeded table fails with a duplicate key.
 */
export const RESET_ALL_SEQUENCES_SCHEMA = [
    `DO $$
    DECLARE
        r record;
        seq text;
    BEGIN
        FOR r IN
            SELECT table_schema, table_name, column_name
            FROM information_schema.columns
            WHERE table_schema IN ('business', 'security')
        LOOP
            seq := pg_get_serial_sequence(format('%I.%I', r.table_schema, r.table_name), r.column_name);
            IF seq IS NOT NULL THEN
                EXECUTE format(
                    'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 0) + 1, false)',
                    seq, r.column_name, r.table_schema, r.table_name
                );
            END IF;
        END LOOP;
    END $$;`,
]
