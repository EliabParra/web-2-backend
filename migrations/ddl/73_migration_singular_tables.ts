/**
 * Migration 73: Singular Tables
 *
 * Este script convierte las tablas de security y business a su formato singular.
 *
 * TODO(REVERT_NAMING): Singular tables & N:M profiles
 */
export const SINGULAR_TABLES_SCHEMA = [
    // 1. Singularizar Business
    `ALTER TABLE business.persons RENAME TO person;`,
    `ALTER TABLE business.groups RENAME TO "group";`, // Palabra reservada

    // 2. Singularizar Security
    `ALTER TABLE security.profiles RENAME TO profile;`,
    `ALTER TABLE security.users RENAME TO "user";`, // Palabra reservada
    `ALTER TABLE security.objects RENAME TO object;`,
    `ALTER TABLE security.methods RENAME TO method;`,
    `ALTER TABLE security.transactions RENAME TO transaction;`,
    `ALTER TABLE security.menus RENAME TO menu;`,
    `ALTER TABLE security.options RENAME TO option;`,

    // (Opcional, si estuviesen en plural, pero usualmente las M:N ya estaban en singular/compuesto)
    // security.object_method, security.profile_subsystem, etc ya tienen nombres correctos.
]
