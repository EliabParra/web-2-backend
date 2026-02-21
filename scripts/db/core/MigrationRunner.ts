import { SchemaLoader } from '../loaders/SchemaLoader.js'
import { Executor } from './executor.js'
import { Database } from './db.js'
import path from 'path'
import colors from 'colors'
import Table from 'cli-table3'

export interface RunnerConfig {
    dryRun?: boolean
    interactive?: boolean
    profile?: string
    silent?: boolean
}

/**
 * Orchestrates the execution of database migrations/schemas.
 */
export class MigrationRunner {
    private loader: SchemaLoader

    constructor(
        private db: Database,
        private config: RunnerConfig,
        private schemasDir: string
    ) {
        this.loader = new SchemaLoader(schemasDir)
    }

    private async initHistoryTable(): Promise<void> {
        if (this.config.dryRun) return

        const sql = `
            CREATE TABLE IF NOT EXISTS _migration_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `
        await this.db.exeRaw(sql)
    }

    private async getAppliedMigrations(): Promise<string[]> {
        if (this.config.dryRun) return []

        try {
            const { rows } = await this.db.exeRaw(
                'SELECT filename FROM _migration_history ORDER BY id ASC'
            )
            return rows.map((r) => r.filename)
        } catch (e) {
            return []
        }
    }

    private async markAsApplied(filename: string): Promise<void> {
        if (this.config.dryRun) return
        await this.db.exeRaw('INSERT INTO _migration_history (filename) VALUES ($1)', [filename])
    }

    async run(): Promise<void> {
        if (!this.config.silent)
            console.log(`\n🔍 Scanning for migrations in: ${this.schemasDir}`.cyan)

        await this.initHistoryTable()
        const applied = await this.getAppliedMigrations()

        const files = await this.loader.listSchemaFiles()

        if (files.length === 0) {
            if (!this.config.silent) console.log('⚠️  No schema files found.'.yellow)
            return
        }

        const pendingFiles = files.filter((f) => !applied.includes(path.basename(f)))

        if (pendingFiles.length === 0) {
            if (!this.config.silent)
                console.log(
                    `✨ Database is up to date for this directory. No pending migrations.\n`.green
                )
            return
        }

        if (!this.config.silent)
            console.log(
                `✨ Found ${pendingFiles.length} pending files. Starting execution...\n`.green
            )

        const executor = new Executor(this.db, this.config.dryRun)

        const table = new Table({
            head: [colors.cyan('ID'), colors.cyan('Migration File'), colors.cyan('Status')],
            style: { head: [], border: [] },
        })

        let index = 1

        for (const file of pendingFiles) {
            const fileName = path.basename(file)
            if (!this.config.silent) console.log(`📄 Processing: ${fileName}`.bold)

            try {
                const fileUrl = path.sep === '\\' ? `file://${file}` : file
                const module = await import(fileUrl)

                const schemaQueries = this.extractQueries(module)

                if (schemaQueries.length === 0) {
                    if (!this.config.silent) console.log(`   ⏭️  Skipping (No queries found)`.gray)
                    table.push([index++, fileName, colors.gray('SKIPPED')])
                    continue
                }

                if (!this.config.dryRun) await executor.run('BEGIN')

                for (const sql of schemaQueries) {
                    await executor.run(sql, [], fileName)
                }

                await this.markAsApplied(fileName)

                if (!this.config.dryRun) await executor.run('COMMIT')

                table.push([index++, fileName, colors.green('APPLIED')])
            } catch (err: any) {
                if (!this.config.dryRun) {
                    try {
                        await executor.run('ROLLBACK')
                    } catch (e) {}
                }
                console.error(`❌ Error processing ${fileName}:`.red, err.message)
                table.push([index++, fileName, colors.red('FAILED')])
                console.log(table.toString())
                throw err
            }
        }

        if (!this.config.silent) {
            console.log('\n📅 Migration Result Summary:')
            console.log(table.toString())
            console.log(`\n✅ All new migrations applied successfully.`.green.bold)
        }
    }

    private extractQueries(module: any): string[] {
        if (Array.isArray(module.BASE_SCHEMA)) return module.BASE_SCHEMA
        if (Array.isArray(module.USERS_SCHEMA)) return module.USERS_SCHEMA
        if (Array.isArray(module.GEO_SCHEMA)) return module.GEO_SCHEMA
        if (Array.isArray(module.AUDIT_SCHEMA)) return module.AUDIT_SCHEMA

        const values = Object.values(module)
        const found = values.find((v) => Array.isArray(v) && v.every((i) => typeof i === 'string'))

        return (found as string[]) || []
    }
}
