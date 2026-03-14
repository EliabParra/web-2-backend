/**
 * Migration: Security Schema Column Naming Convention
 * Renames columns to follow mnemotechnic convention: <table>_<abbreviation>
 * 
 * TODO(REVERT_NAMING): This entire file can be removed to revert naming changes.
 * To fully revert, create a new migration reversing each ALTER TABLE RENAME below.
 */
export const SECURITY_NAMING_SCHEMA = [
    // security.profiles
    `ALTER TABLE security.profiles RENAME COLUMN profile_name TO profile_na;`,

    // security.users
    `ALTER TABLE security.users RENAME COLUMN username TO user_na;`,
    `ALTER TABLE security.users RENAME COLUMN user_password TO user_pw;`,
    `ALTER TABLE security.users RENAME COLUMN user_is_active TO user_act;`,
    `ALTER TABLE security.users RENAME COLUMN user_created_at TO user_created_dt;`,
    `ALTER TABLE security.users RENAME COLUMN user_updated_at TO user_updated_dt;`,
    `ALTER TABLE security.users RENAME COLUMN user_last_login_at TO user_last_login_dt;`,
    `ALTER TABLE security.users RENAME COLUMN user_email TO user_em;`,
    `ALTER TABLE security.users RENAME COLUMN user_email_verified_at TO user_em_verified_dt;`,
    `ALTER TABLE security.users RENAME COLUMN user_solvent TO user_sol;`,

    // security.objects
    `ALTER TABLE security.objects RENAME COLUMN object_name TO object_na;`,

    // security.methods
    `ALTER TABLE security.methods RENAME COLUMN method_name TO method_na;`,

    // security.transactions
    `ALTER TABLE security.transactions RENAME COLUMN transaction_number TO transaction_nu;`,

    // security.menus
    `ALTER TABLE security.menus RENAME COLUMN menu_name TO menu_na;`,

    // security.options
    `ALTER TABLE security.options RENAME COLUMN option_name TO option_na;`,

    // business.persons (created in 50_migration_security_refactor_v1.ts)
    `ALTER TABLE business.persons RENAME COLUMN person_name TO person_na;`,
    `ALTER TABLE business.persons RENAME COLUMN person_lastname TO person_ln;`,
    `ALTER TABLE business.persons RENAME COLUMN person_phone TO person_ph;`,
    `ALTER TABLE business.persons RENAME COLUMN person_degree TO person_deg;`,

    // business.groups (created in 50_migration_security_refactor_v1.ts)
    `ALTER TABLE business.groups RENAME COLUMN group_name TO group_na;`,
]
