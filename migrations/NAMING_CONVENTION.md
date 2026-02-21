# Schema Migration Naming Convention

## Standard Format

```
{NN}_{tipo}_{esquema}_{tabla}.ts
```

## Numeric Ranges

| Range   | Type        | Description                           |
| ------- | ----------- | ------------------------------------- |
| `01-09` | `core`      | Core framework tables (base security) |
| `10-29` | `schema`    | Module schema definitions             |
| `30-49` | `extension` | Schema extensions                     |
| `50-79` | `migration` | Schema migrations/refactors           |
| `80-89` | `index`     | Additional indexes (optional)         |
| `90-99` | `data`      | Seed data (ordered by FK deps)        |

## Current Files

### DDL (Structure)

- `01_core_security_base.ts` - Base security tables
- `10_schema_security_users_extended.ts` - User extensions
- `20_schema_security_auth.ts` - Auth tables (password_resets, OTP)
- `50_migration_security_refactor_v1.ts` - Schema refactoring migration
- `90_schema_security_audit.ts` - Audit log tables

### Data (Seeds)

- `91_data_security_profiles.ts` - Profile data
- `92_data_security_objects.ts` - Object definitions
- `93_data_security_users.ts` - Default users
- `94_data_security_methods.ts` - Method definitions
- `95_data_security_object_method.ts` - Object-Method links
- `96_data_security_profile_method.ts` - Permissions
- `97_data_security_transactions.ts` - TX mappings
- `98_data_security_user_profile.ts` - User role assignments

## Execution Order

Files are executed alphabetically, so numbering ensures:

1. Tables created before FKs
2. Base tables before extensions
3. Migrations after base schema
4. Seeds after all structure
