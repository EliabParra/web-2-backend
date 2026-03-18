/**
 * Migration 73: Singular Tables
 *
 * Converts all tables in security and business schemas to singular form.
 *
 * TODO(REVERT_NAMING): Singular tables & N:M profiles
 */
export const SINGULAR_TABLES_SCHEMA = [
    // 1. Business → singular
    `ALTER TABLE business.persons RENAME TO person;`,
    `ALTER TABLE business.groups RENAME TO "group";`,

    // 2. Security → singular
    `ALTER TABLE security.profiles RENAME TO profile;`,
    `ALTER TABLE security.users RENAME TO "user";`,
    `ALTER TABLE security.objects RENAME TO object;`,
    `ALTER TABLE security.methods RENAME TO method;`,
    `ALTER TABLE security.transactions RENAME TO transaction;`,
    `ALTER TABLE security.subsystems RENAME TO subsystem;`,
    `ALTER TABLE security.menus RENAME TO menu;`,
    `ALTER TABLE security.options RENAME TO option;`,
    `ALTER TABLE security.password_resets RENAME TO password_reset;`,
    `ALTER TABLE security.one_time_codes RENAME TO one_time_code;`,
    `ALTER TABLE security.user_devices RENAME TO user_device;`,
]
