import { describe, it } from 'node:test'
import assert from 'node:assert'
import 'colors'
import { DatabaseResetter } from '../../../scripts/db/seeders/resetter.js'

describe('DatabaseResetter', () => {
    it('should throw an error if confirm is not passed to reset', async () => {
        const mockDb = { exeRaw: async () => ({ rows: [] }) } as any
        const resetter = new DatabaseResetter(mockDb)

        await assert.rejects(async () => resetter.reset(), /Reset requires explicit confirmation/)
    })

    it('should drop all non-system schemas and recreate public', async () => {
        const queries: string[] = []
        const mockDb = {
            exeRaw: async (sql: string) => {
                queries.push(sql.trim())
                if (sql.includes('information_schema.schemata')) {
                    return { rows: [{ schema_name: 'security' }, { schema_name: 'business' }] }
                }
                return { rows: [] }
            },
        } as any

        const resetter = new DatabaseResetter(mockDb)
        const result = await resetter.reset({ confirm: true })

        assert.strictEqual(result.dropped, 2)
        assert.ok(queries.some((q) => q.includes('DROP SCHEMA IF EXISTS "security" CASCADE')))
        assert.ok(queries.some((q) => q.includes('DROP SCHEMA IF EXISTS "business" CASCADE')))
        assert.ok(queries.some((q) => q.includes('CREATE SCHEMA public')))
    })

    it('should do nothing if no schemas exist to drop', async () => {
        const queries: string[] = []
        const mockDb = {
            exeRaw: async (sql: string) => {
                queries.push(sql.trim())
                if (sql.includes('information_schema.schemata')) {
                    return { rows: [] }
                }
                return { rows: [] }
            },
        } as any

        const resetter = new DatabaseResetter(mockDb)
        const result = await resetter.reset({ confirm: true })

        assert.strictEqual(result.dropped, 0)
        assert.ok(!queries.some((q) => q.includes('DROP SCHEMA')))
        assert.ok(!queries.some((q) => q.includes('CREATE SCHEMA public')))
    })

    it('should truncate all user tables', async () => {
        const queries: string[] = []
        const mockDb = {
            exeRaw: async (sql: string) => {
                queries.push(sql.trim())
                if (sql.includes('information_schema.tables')) {
                    return {
                        rows: [
                            { table_schema: 'security', table_name: 'users' },
                            { table_schema: 'security', table_name: 'profiles' },
                        ],
                    }
                }
                return { rows: [] }
            },
        } as any

        const resetter = new DatabaseResetter(mockDb)
        const result = await resetter.truncateAll()

        assert.strictEqual(result.truncated, 2)
        assert.ok(queries.some((q) => q.includes('TRUNCATE TABLE "security"."users" CASCADE')))
        assert.ok(queries.some((q) => q.includes('TRUNCATE TABLE "security"."profiles" CASCADE')))
    })
})
