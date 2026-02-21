import { Database } from '../core/db.js'
import colors from 'colors'

/**
 * Resets the database by dropping and recreating all schemas.
 */
export class DatabaseResetter {
    constructor(private db: Database) {}

    /**
     * Drops all non-system schemas and recreates public.
     * WARNING: This is destructive!
     */
    async reset(options: { confirm?: boolean } = {}): Promise<{ dropped: number }> {
        if (!options.confirm) {
            throw new Error('Reset requires explicit confirmation. Pass { confirm: true }')
        }

        console.log(`\n🗑️  Resetting database...`.red.bold)
        console.log(`   ⚠️  This will DROP all non-system schemas completely!`.yellow)

        // Get list of non-system schemas
        const schemaResult = await this.db.exeRaw(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema') 
              AND schema_name NOT LIKE 'pg_%'
        `)

        const schemas = schemaResult.rows.map((r) => r.schema_name)

        if (schemas.length === 0) {
            console.log(`   ℹ️  No schemas found to drop`.gray)
            return { dropped: 0 }
        }

        console.log(`   📋 Schemas to drop: ${schemas.join(', ')}`.gray)

        let droppedCount = 0

        // Drop each schema with CASCADE
        for (const schema of schemas) {
            await this.db.exeRaw(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
            console.log(`   ❌ Dropped Schema: ${schema}`.red)
            droppedCount++
        }

        // Recreate public schema (default necessary)
        await this.db.exeRaw(`CREATE SCHEMA public`)
        console.log(`   ✨ Recreated Schema: public`.green)

        console.log(`\n   ✅ Reset complete. ${droppedCount} schemas dropped.`.green.bold)
        return { dropped: droppedCount }
    }

    /**
     * Truncates all tables in all non-system schemas (keeps structure, deletes data).
     */
    async truncateAll(): Promise<{ truncated: number }> {
        console.log(`\n🧹 Truncating all user tables...`.yellow)

        // Query all tables across all non-system schemas
        const tablesResult = await this.db.exeRaw(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema') 
              AND table_schema NOT LIKE 'pg_%'
              AND table_type = 'BASE TABLE'
        `)

        const tables = tablesResult.rows

        for (const { table_schema, table_name } of tables) {
            try {
                await this.db.exeRaw(`TRUNCATE TABLE "${table_schema}"."${table_name}" CASCADE`)
                console.log(`   🧹 Truncated: ${table_schema}.${table_name}`.gray)
            } catch (err: any) {
                console.log(
                    `   ⚠️  Could not truncate: ${table_schema}.${table_name} (${err.message})`
                        .yellow
                )
            }
        }

        return { truncated: tables.length }
    }
}
