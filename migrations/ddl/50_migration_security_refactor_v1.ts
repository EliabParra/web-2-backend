/**
 * Phase 5: Legacy Data Migration
 * Idempotent migration logic for evolving from legacy schema.
 * On a fresh install, most DO $$ blocks are no-ops.
 *
 * Handles:
 * 1. user_profile N:M table creation
 * 2. Legacy column renames on users (id→user_id, etc.)
 * 3. Legacy data migration from methods (object_id, tx)
 * 4. person_id FK on users
 */
export const REFACTOR_PHASE1_SCHEMA = [
    // --- 1. User-Profile N:M table ---
    `CREATE TABLE IF NOT EXISTS security.user_profile (
        user_profile_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES security.users(user_id),
        profile_id INTEGER REFERENCES security.profiles(profile_id),
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_user_profile UNIQUE (user_id, profile_id)
    );`,
    `CREATE INDEX IF NOT EXISTS ix_user_profile_profile_id ON security.user_profile(profile_id);`,

    // --- 2. Legacy column renames on users (idempotent) ---
    `DO $$
    BEGIN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='id') THEN
            ALTER TABLE security.users RENAME COLUMN id TO user_id;
        END IF;

        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='password_hash') THEN
            ALTER TABLE security.users RENAME COLUMN password_hash TO user_password;
        END IF;

        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='created_at') THEN
            ALTER TABLE security.users RENAME COLUMN created_at TO user_created_at;
        END IF;

        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='updated_at') THEN
            ALTER TABLE security.users RENAME COLUMN updated_at TO user_updated_at;
        END IF;

        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='is_active') THEN
            ALTER TABLE security.users RENAME COLUMN is_active TO user_is_active;
        END IF;

        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='last_login_at') THEN
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='user_last_login_at') THEN
                ALTER TABLE security.users RENAME COLUMN last_login_at TO user_last_login_at;
            END IF;
        END IF;

        -- Email collision handling
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='user_email') AND
           EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='email') THEN
            UPDATE security.users SET user_email = email WHERE user_email IS NULL;
            ALTER TABLE security.users DROP COLUMN email;
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='email') THEN
            ALTER TABLE security.users RENAME COLUMN email TO user_email;
        END IF;

        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='user_email_verified_at') AND
           EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='email_verified_at') THEN
            UPDATE security.users SET user_email_verified_at = email_verified_at WHERE user_email_verified_at IS NULL;
            ALTER TABLE security.users DROP COLUMN email_verified_at;
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='email_verified_at') THEN
            ALTER TABLE security.users RENAME COLUMN email_verified_at TO user_email_verified_at;
        END IF;
    END $$;`,

    // --- 3. Legacy column renames on objects/methods/profiles (idempotent) ---
    `DO $$
    BEGIN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='objects' AND column_name='id') THEN
            ALTER TABLE security.objects RENAME COLUMN id TO object_id;
        END IF;
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='objects' AND column_name='name') THEN
            ALTER TABLE security.objects RENAME COLUMN name TO object_name;
        END IF;

        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='methods' AND column_name='id') THEN
            ALTER TABLE security.methods RENAME COLUMN id TO method_id;
        END IF;
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='methods' AND column_name='name') THEN
            ALTER TABLE security.methods RENAME COLUMN name TO method_name;
        END IF;

        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='profiles' AND column_name='id') THEN
            ALTER TABLE security.profiles RENAME COLUMN id TO profile_id;
        END IF;
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='profiles' AND column_name='name') THEN
            ALTER TABLE security.profiles RENAME COLUMN name TO profile_name;
        END IF;
    END $$;`,

    // --- 4. Migrate legacy methods data (split object_id and tx) ---
    `DO $$
    BEGIN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='methods' AND column_name='object_id') THEN
            INSERT INTO security.object_method (object_id, method_id)
            SELECT object_id, method_id FROM security.methods
            WHERE object_id IS NOT NULL
            ON CONFLICT (object_id, method_id) DO NOTHING;
        END IF;

        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='methods' AND column_name='tx') THEN
            INSERT INTO security.transactions (transaction_number, method_id, object_id)
            SELECT tx::text, method_id, object_id FROM security.methods
            WHERE tx IS NOT NULL
            ON CONFLICT (transaction_number) DO NOTHING;
        END IF;
    END $$;`,

    // Drop legacy columns from methods
    `ALTER TABLE security.methods DROP COLUMN IF EXISTS object_id;`,
    `ALTER TABLE security.methods DROP COLUMN IF EXISTS tx;`,

    // --- 5. Add person_id FK to users (depends on business.persons from 30) ---
    `ALTER TABLE security.users ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES business.persons(person_id);`,

    // --- 6. Idempotent constraints ---
    `DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'uq_object_method' AND table_name = 'object_method' AND table_schema = 'security') THEN
            ALTER TABLE security.object_method ADD CONSTRAINT uq_object_method UNIQUE (object_id, method_id);
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'uq_transaction_number' AND table_name = 'transactions' AND table_schema = 'security') THEN
            ALTER TABLE security.transactions ADD CONSTRAINT uq_transaction_number UNIQUE (transaction_number);
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'uq_profile_method' AND table_name = 'profile_method' AND table_schema = 'security') THEN
            ALTER TABLE security.profile_method ADD CONSTRAINT uq_profile_method UNIQUE (profile_id, method_id);
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'uq_user_profile' AND table_name = 'user_profile' AND table_schema = 'security') THEN
            ALTER TABLE security.user_profile ADD CONSTRAINT uq_user_profile UNIQUE (user_id, profile_id);
        END IF;
    END $$;`,
]
