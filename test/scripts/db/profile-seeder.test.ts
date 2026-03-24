import { describe, it, mock } from 'node:test'
import assert from 'node:assert'
import { ProfileSeeder } from '../../../scripts/db/seeders/profiles.js'

// Mock Database
const createMockDb = () => ({
    exeRaw: mock.fn(async (sql: string, params?: any[]) => {
        if (sql.includes('pg_get_serial_sequence')) {
            return { rows: [{ seq_name: 'security.profile_profile_id_seq' }], rowCount: 1 }
        }
        if (sql.includes('setval(')) {
            return { rows: [{ setval: 3 }], rowCount: 1 }
        }
        return { rows: [{ profile_id: params?.[0] }], rowCount: 1 }
    }),
})

describe('ProfileSeeder', () => {
    it('should seed public and session profiles', async () => {
        const mockDb = createMockDb()
        const seeder = new ProfileSeeder(mockDb as any)

        const result = await seeder.seed({
            publicProfileId: 2,
            sessionProfileId: 1,
        })

        assert.strictEqual(result.created, 2)

        // Verify two inserts + sequence sync (get sequence + setval)
        assert.strictEqual(mockDb.exeRaw.mock.calls.length, 4)

        // Verify new schema columns used (profile_id, profile_na)
        const firstCall = mockDb.exeRaw.mock.calls[0].arguments[0] as string
        assert.ok(firstCall.includes('profile_id'), 'Should use profile_id column')
        assert.ok(firstCall.includes('profile_na'), 'Should use profile_na column')
    })

    it('should seed admin profile when provided', async () => {
        const mockDb = createMockDb()
        const seeder = new ProfileSeeder(mockDb as any)

        const result = await seeder.seed({
            publicProfileId: 2,
            sessionProfileId: 1,
            adminProfileId: 99,
        })

        assert.strictEqual(result.created, 3)

        // Verify three inserts + sequence sync
        assert.strictEqual(mockDb.exeRaw.mock.calls.length, 5)
    })

    it('should grant permissions to profile using profile_method table', async () => {
        const mockDb = createMockDb()
        const seeder = new ProfileSeeder(mockDb as any)

        const granted = await seeder.grantPermissions(1, [10, 20, 30])

        assert.strictEqual(granted, 3)

        // Verify new table name used (profile_method, not permission_methods)
        const grantCall = mockDb.exeRaw.mock.calls[0].arguments[0] as string
        assert.ok(grantCall.includes('profile_method'), 'Should use profile_method table')
    })
})
