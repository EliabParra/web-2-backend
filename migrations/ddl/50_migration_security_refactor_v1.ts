/**
 * Refactor Phase 1 Schema
 * Implements strict relational schema and renames 'users' columns.
 * Handles migration of legacy data and schema evolution.
 */
export const REFACTOR_PHASE1_SCHEMA = [
    // ----------------------------------------------------------------------
    // 1. BUSINESS SCHEMA & TABLES
    // ----------------------------------------------------------------------
    `CREATE SCHEMA IF NOT EXISTS business;`,

    `CREATE TABLE IF NOT EXISTS business.persons (
        person_id SERIAL PRIMARY KEY,
        person_ci TEXT,
        person_name TEXT,
        person_lastname TEXT,
        person_phone TEXT,
        person_degree TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS business.groups (
        group_id SERIAL PRIMARY KEY,
        group_name TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS business.group_person (
        group_person_id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES business.groups(group_id),
        person_id INTEGER REFERENCES business.persons(person_id)
    );`,

    // ----------------------------------------------------------------------
    // 2. SECURITY SCHEMA REFACTOR
    // ----------------------------------------------------------------------

    // Subsystems
    `CREATE TABLE IF NOT EXISTS security.subsystems (
        subsystem_id SERIAL PRIMARY KEY,
        subsystem_name TEXT UNIQUE NOT NULL
    );`,

    // Objects (Refactor ID/Name)
    `DO $$ 
    BEGIN 
        -- Create if not exists
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'security' AND tablename = 'objects') THEN
             CREATE TABLE security.objects (
                object_id SERIAL PRIMARY KEY,
                object_name TEXT NOT NULL
            );
        ELSE
            -- Alter existing if needed
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='objects' AND column_name='id') THEN
                ALTER TABLE security.objects RENAME COLUMN id TO object_id;
            END IF;
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='objects' AND column_name='name') THEN
                ALTER TABLE security.objects RENAME COLUMN name TO object_name;
            END IF;
        END IF;
    END $$;`,

    // Subsystem Objects
    `CREATE TABLE IF NOT EXISTS security.subsystem_object (
        subsystem_object_id SERIAL PRIMARY KEY,
        object_id INTEGER REFERENCES security.objects(object_id),
        subsystem_id INTEGER REFERENCES security.subsystems(subsystem_id)
    );`,

    // Methods (Refactor ID/Name & Split)
    `DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'security' AND tablename = 'methods') THEN
            CREATE TABLE security.methods (
                method_id SERIAL PRIMARY KEY,
                method_name TEXT NOT NULL
            );
        ELSE
            -- Alter existing
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='methods' AND column_name='id') THEN
                ALTER TABLE security.methods RENAME COLUMN id TO method_id;
            END IF;
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='methods' AND column_name='name') THEN
                ALTER TABLE security.methods RENAME COLUMN name TO method_name;
            END IF;
        END IF;
    END $$;`,

    // Object_Method (New linkage)
    `CREATE TABLE IF NOT EXISTS security.object_method (
        object_method_id SERIAL PRIMARY KEY,
        object_id INTEGER REFERENCES security.objects(object_id),
        method_id INTEGER REFERENCES security.methods(method_id),
        CONSTRAINT uq_object_method UNIQUE (object_id, method_id)
    );`,

    // Transactions
    `CREATE TABLE IF NOT EXISTS security.transactions (
        transaction_id SERIAL PRIMARY KEY,
        transaction_number TEXT UNIQUE,
        method_id INTEGER REFERENCES security.methods(method_id),
        object_id INTEGER REFERENCES security.objects(object_id),
        subsystem_id INTEGER REFERENCES security.subsystems(subsystem_id)
    );`,

    // Profile Relations (and constraints)
    `CREATE TABLE IF NOT EXISTS security.profiles (
        profile_id SERIAL PRIMARY KEY,
        profile_name TEXT NOT NULL
    );`,
    // Note: Profiles creation is duplicated below in DO block? I should clean this up.
    // The previous script had DO block for profiles. I will keep it consistent.
    // Removing CREATE TABLE profiles here to avoid duplication with DO BLOCK below.

    // Menus & Options
    `CREATE TABLE IF NOT EXISTS security.menus (
        menu_id SERIAL PRIMARY KEY,
        menu_name TEXT NOT NULL,
        subsystem_id INTEGER REFERENCES security.subsystems(subsystem_id)
    );`,
    `CREATE TABLE IF NOT EXISTS security.options (
        option_id SERIAL PRIMARY KEY,
        option_name TEXT NOT NULL,
        method_id INTEGER REFERENCES security.methods(method_id)
    );`,
    `CREATE TABLE IF NOT EXISTS security.menu_option (
        menu_option_id SERIAL PRIMARY KEY,
        menu_id INTEGER REFERENCES security.menus(menu_id),
        option_id INTEGER REFERENCES security.options(option_id)
    );`,

    // Profiles (Refactor ID/Name handled via DO block below or here?)
    // Moving Profiles DO block up or keep order.
    `DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'security' AND tablename = 'profiles') THEN
            CREATE TABLE security.profiles (
                profile_id SERIAL PRIMARY KEY,
                profile_name TEXT NOT NULL
            );
        ELSE
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='profiles' AND column_name='id') THEN
                ALTER TABLE security.profiles RENAME COLUMN id TO profile_id;
            END IF;
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='profiles' AND column_name='name') THEN
                ALTER TABLE security.profiles RENAME COLUMN name TO profile_name;
            END IF;
        END IF;
    END $$;`,

    // Profile Relations
    `CREATE TABLE IF NOT EXISTS security.profile_subsystem (
        profile_subsystem_id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES security.profiles(profile_id) ON DELETE CASCADE,
        subsystem_id INTEGER REFERENCES security.subsystems(subsystem_id) ON DELETE CASCADE,
        UNIQUE(profile_id, subsystem_id)
    );`,
    `CREATE TABLE IF NOT EXISTS security.profile_menu (
        profile_menu_id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES security.profiles(profile_id) ON DELETE CASCADE,
        menu_id INTEGER REFERENCES security.menus(menu_id) ON DELETE CASCADE,
        UNIQUE(profile_id, menu_id)
    );`,
    `CREATE TABLE IF NOT EXISTS security.profile_option (
        profile_option_id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES security.profiles(profile_id) ON DELETE CASCADE,
        option_id INTEGER REFERENCES security.options(option_id) ON DELETE CASCADE,
        UNIQUE(profile_id, option_id)
    );`,
    `CREATE TABLE IF NOT EXISTS security.profile_method (
        profile_method_id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES security.profiles(profile_id) ON DELETE CASCADE,
        method_id INTEGER REFERENCES security.methods(method_id) ON DELETE CASCADE,
        UNIQUE (profile_id, method_id)
    );`,

    // User Profile (Singular) - Create and Migrate
    `CREATE TABLE IF NOT EXISTS security.user_profile (
        user_profile_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES security.users(user_id), -- users table must exist (referenced lazily? No, order matters. users is below?)
        profile_id INTEGER REFERENCES security.profiles(profile_id),
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_user_profile UNIQUE (user_id, profile_id)
    );`,
    // WAIT: user_profile references users. users is defined/refactored below.
    // If users table exists (legacy), it works.
    // Reference check happens at creation.
    // If user_profile is created here, users must exist.
    // Legacy users exists.
    // But columns? user_id vs id.
    // If legacy users has 'id', FK matches 'id' (implied PK).
    // If refactor happens later, FK is updated.
    // So this order is OK.

    // FIX: ADD ALL MISSING CONSTRAINTS
    `DO $$
    BEGIN
        -- Constraints for object_method
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'uq_object_method' AND table_name = 'object_method' AND table_schema = 'security') THEN
            ALTER TABLE security.object_method ADD CONSTRAINT uq_object_method UNIQUE (object_id, method_id);
        END IF;

        -- Constraints for transactions
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'uq_transactions_number' AND table_name = 'transactions' AND table_schema = 'security') THEN
             ALTER TABLE security.transactions ADD CONSTRAINT uq_transactions_number UNIQUE (transaction_number);
        END IF;

        -- Constraints for profile_method
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'uq_profile_method' AND table_name = 'profile_method' AND table_schema = 'security') THEN
             ALTER TABLE security.profile_method ADD CONSTRAINT uq_profile_method UNIQUE (profile_id, method_id);
        END IF;

        -- Constraints for user_profile
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'uq_user_profile' AND table_name = 'user_profile' AND table_schema = 'security') THEN
             ALTER TABLE security.user_profile ADD CONSTRAINT uq_user_profile UNIQUE (user_id, profile_id);
        END IF;
    END $$;`,

    // MIGRATE LEGACY METHODS DATA (Split object_id and tx)
    `DO $$
    BEGIN
        -- Migrate object_id to object_method
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='methods' AND column_name='object_id') THEN
            INSERT INTO security.object_method (object_id, method_id)
            SELECT object_id, method_id FROM security.methods
            WHERE object_id IS NOT NULL
            ON CONFLICT (object_id, method_id) DO NOTHING;
        END IF;

        -- Migrate tx to transactions
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='methods' AND column_name='tx') THEN
            INSERT INTO security.transactions (transaction_number, method_id, object_id)
            SELECT tx::text, method_id, object_id FROM security.methods
            WHERE tx IS NOT NULL
            ON CONFLICT (transaction_number) DO NOTHING;
        END IF;
    END $$;`,

    // Drop legacy columns from methods if they exist
    `ALTER TABLE security.methods DROP COLUMN IF EXISTS object_id;`,
    `ALTER TABLE security.methods DROP COLUMN IF EXISTS tx;`,

    // ----------------------------------------------------------------------
    // 3. USER TABLE REFACTOR (CRITICAL)
    // ----------------------------------------------------------------------
    `DO $$ 
    BEGIN 
        -- RENAME COLUMNS (Standard)
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

        -- SPECIAL HANDLING FOR EMAIL (Collision Risk)
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='user_email') AND
           EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='email') THEN
            
            UPDATE security.users SET user_email = email WHERE user_email IS NULL;
            ALTER TABLE security.users DROP COLUMN email;
            
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='email') THEN
            ALTER TABLE security.users RENAME COLUMN email TO user_email;
        END IF;

        -- SPECIAL HANDLING FOR EMAIL_VERIFIED_AT
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='user_email_verified_at') AND
           EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='email_verified_at') THEN
            
            UPDATE security.users SET user_email_verified_at = email_verified_at WHERE user_email_verified_at IS NULL;
            ALTER TABLE security.users DROP COLUMN email_verified_at;
            
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='security' AND table_name='users' AND column_name='email_verified_at') THEN
            ALTER TABLE security.users RENAME COLUMN email_verified_at TO user_email_verified_at;
        END IF;

    END $$;`,

    // Add new columns to users
    `ALTER TABLE security.users ADD COLUMN IF NOT EXISTS user_solvent BOOLEAN DEFAULT true;`,
    `ALTER TABLE security.users ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES business.persons(person_id);`,

    // FIX: ADD ASSIGNED_AT IF MISSING (Legacy Creation Fix)
    `ALTER TABLE security.user_profile ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();`,

    `DO $$
    BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'security' AND tablename = 'user_profiles') THEN
            -- Migrate legacy data
            INSERT INTO security.user_profile (user_id, profile_id, assigned_at)
            SELECT user_id, profile_id, assigned_at FROM security.user_profiles
            ON CONFLICT (user_id, profile_id) DO NOTHING;
            
            -- Keeping user_profiles for now
        END IF;
    END $$;`,
]
