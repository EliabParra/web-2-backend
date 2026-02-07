import 'dotenv/config'
import { Database } from './core/db.js'
import { ConfigBuilder } from './core/config-builder.js'
import { parseCliArgs } from './cli/parser.js'

async function main() {
    const args = { action: 'print', profile: 'development' }
    const builder = new ConfigBuilder()
    const config = await builder.buildBasic(args as any)

    const dbConfig = {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        ssl: config.db.ssl,
    }

    console.log('Connecting to:', dbConfig.host, dbConfig.database)
    const db = new Database(dbConfig)

    console.log('--- TABLES ---')
    try {
        const res = await db.query({
            sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'security'`,
        })
        console.table(res.rows)

        console.log('--- CONSTRAINTS ---')
        const res2 = await db.query({
            sql: `
            SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
            FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name 
              AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'security'
            ORDER BY tc.table_name, tc.constraint_name
        `,
        })
        console.table(res2.rows)
    } catch (e: any) {
        console.error('Query failed:', e.message)
    }

    await db.close()
}

main().catch(console.error)
