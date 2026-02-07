import 'dotenv/config'
import { Pool } from 'pg'
import { PermissionGuard } from '../src/core/security/PermissionGuard.js'

// Simple DB wrapper
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'web2_backend',
})

const db: any = {
    pool,
    query: async (sql: string, params?: unknown[]) => pool.query(sql, params),
    exeRaw: async (sql: string, params?: unknown) => pool.query(sql, params as any[]),
    shutdown: async () => pool.end(),
}

const log: any = {
    trace: (m: string) => console.log(`[TRACE] ${m}`),
    debug: (m: string) => console.log(`[DEBUG] ${m}`),
    info: (m: string) => console.log(`[INFO] ${m}`),
    warn: (m: string) => console.warn(`[WARN] ${m}`),
    error: (m: string) => console.error(`[ERROR] ${m}`),
    critical: (m: string) => console.error(`[CRIT] ${m}`),
    child: () => log,
}

async function main() {
    console.log('=== PermissionGuard Dual-Write Test ===\n')

    const guard = new PermissionGuard(db, log)

    try {
        // Setup test data
        console.log('1. Setting up test data...')
        await pool.query(
            "INSERT INTO security.profiles (profile_name) VALUES ('dual_write_test') ON CONFLICT DO NOTHING"
        )
        await pool.query(
            "INSERT INTO security.objects (object_name) VALUES ('DWTestObj') ON CONFLICT DO NOTHING"
        )

        // Check schema for methods.object_id
        const colCheck = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='security' AND table_name='methods'"
        )
        const cols = colCheck.rows.map((r: any) => r.column_name)
        console.log(`   Methods columns: ${cols.join(', ')}`)

        const hasObjectId = cols.includes('object_id')

        if (hasObjectId) {
            const objRes = await pool.query(
                "SELECT object_id FROM security.objects WHERE object_name = 'DWTestObj'"
            )
            const oid = objRes.rows[0].object_id
            await pool.query(
                "INSERT INTO security.methods (method_name, object_id) VALUES ('dw_test_method', $1) ON CONFLICT DO NOTHING",
                [oid]
            )
        } else {
            await pool.query(
                "INSERT INTO security.methods (method_name) VALUES ('dw_test_method') ON CONFLICT (method_name) DO NOTHING"
            )
            // Link via object_method
            const objRes = await pool.query(
                "SELECT object_id FROM security.objects WHERE object_name = 'DWTestObj'"
            )
            const methRes = await pool.query(
                "SELECT method_id FROM security.methods WHERE method_name = 'dw_test_method'"
            )
            if (objRes.rows.length && methRes.rows.length) {
                await pool.query(
                    'INSERT INTO security.object_method (object_id, method_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [objRes.rows[0].object_id, methRes.rows[0].method_id]
                )
            }
        }

        const profRes = await pool.query(
            "SELECT profile_id FROM security.profiles WHERE profile_name = 'dual_write_test'"
        )
        const profileId = profRes.rows[0].profile_id as number
        console.log(`   Profile ID: ${profileId}`)

        // Load permissions
        console.log('\n2. Loading permissions into memory...')
        await guard.load()

        // Check permission (should be false)
        console.log('\n3. Checking permission BEFORE grant...')
        const before = guard.check(profileId, 'DWTestObj', 'dw_test_method')
        console.log(`   Permission exists: ${before}`)

        // Grant permission (dual write)
        console.log('\n4. Granting permission (dual-write)...')
        const granted = await guard.grant(profileId, 'DWTestObj', 'dw_test_method')
        console.log(`   Grant result: ${granted}`)

        // Check permission (should be true - in memory)
        console.log('\n5. Checking permission AFTER grant (memory)...')
        const afterGrant = guard.check(profileId, 'DWTestObj', 'dw_test_method')
        console.log(`   Permission exists: ${afterGrant}`)

        // Verify DB write
        console.log('\n6. Verifying DB write...')
        const dbVerify = await pool.query(
            `
            SELECT pm.* FROM security.profile_method pm
            JOIN security.methods m ON pm.method_id = m.method_id
            WHERE pm.profile_id = $1 AND m.method_name = 'dw_test_method'
        `,
            [profileId]
        )
        console.log(`   DB rows found: ${dbVerify.rowCount}`)

        // Revoke permission (dual write)
        console.log('\n7. Revoking permission (dual-write)...')
        const revoked = await guard.revoke(profileId, 'DWTestObj', 'dw_test_method')
        console.log(`   Revoke result: ${revoked}`)

        // Check permission (should be false - in memory)
        console.log('\n8. Checking permission AFTER revoke (memory)...')
        const afterRevoke = guard.check(profileId, 'DWTestObj', 'dw_test_method')
        console.log(`   Permission exists: ${afterRevoke}`)

        // Summary
        console.log('\n=== TEST SUMMARY ===')
        console.log(`Before Grant: ${before === false ? '✅ PASS' : '❌ FAIL'}`)
        console.log(`After Grant:  ${afterGrant === true ? '✅ PASS' : '❌ FAIL'}`)
        console.log(`DB Persisted: ${(dbVerify.rowCount ?? 0) > 0 ? '✅ PASS' : '❌ FAIL'}`)
        console.log(`After Revoke: ${afterRevoke === false ? '✅ PASS' : '❌ FAIL'}`)
    } catch (e) {
        console.error('Test Error:', e)
    } finally {
        await pool.end()
    }
}

main()
