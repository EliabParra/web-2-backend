import { describe, it, mock } from 'node:test'
import assert from 'node:assert'
import { ProfileSeeder } from '../../../scripts/db/seeders/profiles.js'

// Mock Database
const createMockDb = () => ({
    exeRaw: mock.fn(async (sql: string, params?: any[]) => {
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

        // Verify both profiles were created
        assert.strictEqual(mockDb.exeRaw.mock.calls.length, 2)

        // Verify new schema columns used (profile_id, profile_name)
        const firstCall = mockDb.exeRaw.mock.calls[0].arguments[0] as string
        assert.ok(firstCall.includes('profile_id'), 'Should use profile_id column')
        assert.ok(firstCall.includes('profile_name'), 'Should use profile_name column')
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
