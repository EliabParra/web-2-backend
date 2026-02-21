import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'path'
import os from 'os'
import { MigrationRunner } from '../../../scripts/db/core/MigrationRunner.js'

describe('MigrationRunner', () => {
    let tempDir: string

    before(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'toproc-migration-test-'))
        // Create a couple of mock migration files
        await fs.writeFile(
            path.join(tempDir, '01_schema_one.ts'),
            `export const BASE_SCHEMA = ["CREATE TABLE one (id INT);", "INSERT INTO one VALUES (1);"]`
        )
        await fs.writeFile(
            path.join(tempDir, '02_schema_two.ts'),
            `export const BASE_SCHEMA = ["CREATE TABLE two (id INT);"]`
        )
        await fs.writeFile(
            path.join(tempDir, '03_schema_empty.ts'),
            `export const BASE_SCHEMA = []`
        )
    })

    after(async () => {
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    it('should run only unapplied migrations and track history', async () => {
        const queries: string[] = []

        // Mock DB connection
        const mockDb = {
            exeRaw: async (sql: string, params: any[] = []) => {
                queries.push(sql.trim())

                // Simulate that 01_schema_one.ts is already applied
                if (sql.includes('SELECT filename FROM _migration_history')) {
                    return { rows: [{ filename: '01_schema_one.ts' }] }
                }

                return { rows: [] }
            },
        } as any

        const config = { silent: true }
        const runner = new MigrationRunner(mockDb, config, tempDir)

        await runner.run()

        // What we expect:
        // 1. History table initialized
        // 2. Query history to find applied
        // 3. 02_schema_two.ts and 03_schema_empty.ts are picked up.
        // 4. 03 is empty so it's skipped without query.
        // 5. 02 has BEGIN, its SQL, mark as applied, and COMMIT.

        const queryStr = queries.join('||')

        // History checked
        assert.ok(queryStr.includes('CREATE TABLE IF NOT EXISTS _migration_history'))
        assert.ok(queryStr.includes('SELECT filename FROM _migration_history'))

        // We shouldn't see 'CREATE TABLE one'
        assert.ok(!queryStr.includes('CREATE TABLE one'))

        // We should see BEGIN, CREATE TABLE two, insert into history, and COMMIT
        assert.ok(queryStr.includes('BEGIN'))
        assert.ok(queryStr.includes('CREATE TABLE two (id INT);'))
        assert.ok(queryStr.includes('INSERT INTO _migration_history (filename) VALUES ($1)'))
        assert.ok(queryStr.includes('COMMIT'))
    })

    it('should trigger rollback if migration fails', async () => {
        const queries: string[] = []

        const mockDb = {
            exeRaw: async (sql: string, params: any[] = []) => {
                queries.push(sql.trim())

                // Simulate no prior migrations applied
                if (sql.includes('SELECT filename FROM _migration_history')) {
                    return { rows: [] }
                }

                if (sql.includes('CREATE TABLE two')) {
                    throw new Error('Fake SQL Error on table two')
                }

                return { rows: [] }
            },
        } as any

        const config = { silent: true }
        const runner = new MigrationRunner(mockDb, config, tempDir)

        await assert.rejects(async () => runner.run(), /Fake SQL Error on table two/)

        const queryStr = queries.join('||')

        // It should have executed the first table fine:
        assert.ok(queryStr.includes('CREATE TABLE one (id INT);'))
        assert.ok(queryStr.includes('INSERT INTO one VALUES (1);'))
        assert.ok(queryStr.includes('INSERT INTO _migration_history (filename) VALUES ($1)'))
        assert.ok(queryStr.includes('COMMIT')) // of the first file successfully

        // The second file triggered a Rollback
        assert.ok(queryStr.includes('ROLLBACK'))
    })

    it('should do nothing gracefully if dryRun is enabled', async () => {
        const queries: string[] = []
        const mockDb = {
            exeRaw: async (sql: string, params: any[] = []) => {
                queries.push(sql.trim())
                return { rows: [] }
            },
        } as any

        const config = { silent: true, dryRun: true }
        const runner = new MigrationRunner(mockDb, config, tempDir)

        await runner.run()

        const queryStr = queries.join('||')
        // In dryRun, it should NOT try to create history table nor execute real sql
        assert.ok(!queryStr.includes('CREATE TABLE IF NOT EXISTS _migration_history'))
        assert.ok(!queryStr.includes('INSERT INTO _migration_history'))
        assert.ok(!queryStr.includes('BEGIN'))
        assert.ok(!queryStr.includes('COMMIT'))

        // It only "prints" sql but does not `exeRaw`, because executor tracks dryRun internally using console.log
        // Let's assert NO real queries to DB were made (exeRaw never called)
        assert.strictEqual(queries.length, 0)
    })
})
