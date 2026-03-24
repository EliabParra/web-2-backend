import { Database } from '../core/db.js'
import colors from 'colors'

export interface ProfileSeedOptions {
    publicProfileId: number
    sessionProfileId: number
    adminProfileId?: number
}

/**
 * Seeds default profiles (public, session, admin).
 */
export class ProfileSeeder {
    constructor(private db: Database) {}

    /**
     * Creates profiles if they don't exist.
     * Uses NEW schema: profile_id, profile_na (not id, name)
     */
    async seed(options: ProfileSeedOptions): Promise<{ created: number }> {
        const { publicProfileId, sessionProfileId, adminProfileId } = options

        console.log(`\n🏷️  Seeding profiles...`.cyan)

        let created = 0

        // Public profile (for anonymous/unauthenticated users)
        if (publicProfileId) {
            const r = await this.db.exeRaw(
                `INSERT INTO security.profile (profile_id, profile_na) 
                 VALUES ($1, 'public') 
                 ON CONFLICT (profile_id) DO UPDATE SET profile_na = COALESCE(security.profile.profile_na, 'public')
                 RETURNING profile_id`,
                [publicProfileId]
            )
            if (r.rowCount && r.rowCount > 0) created++
            console.log(`   ✅ Public profile (id=${publicProfileId})`.green)
        }

        // Session profile (for logged-in users)
        if (sessionProfileId) {
            const r = await this.db.exeRaw(
                `INSERT INTO security.profile (profile_id, profile_na) 
                 VALUES ($1, 'session') 
                 ON CONFLICT (profile_id) DO UPDATE SET profile_na = COALESCE(security.profile.profile_na, 'session')
                 RETURNING profile_id`,
                [sessionProfileId]
            )
            if (r.rowCount && r.rowCount > 0) created++
            console.log(`   ✅ Session profile (id=${sessionProfileId})`.green)
        }

        // Admin profile (optional, for super users)
        if (adminProfileId) {
            const r = await this.db.exeRaw(
                `INSERT INTO security.profile (profile_id, profile_na) 
                 VALUES ($1, 'admin') 
                 ON CONFLICT (profile_id) DO UPDATE SET profile_na = COALESCE(security.profile.profile_na, 'admin')
                 RETURNING profile_id`,
                [adminProfileId]
            )
            if (r.rowCount && r.rowCount > 0) created++
            console.log(`   ✅ Admin profile (id=${adminProfileId})`.green)
        }

        await this.syncProfileSequence()

        console.log(`   📊 Profiles seeded: ${created}`.gray)
        return { created }
    }

    /**
     * Aligns identity sequence with the current max(profile_id).
     * Prevents duplicate key errors after explicit ID inserts during seeding.
     */
    private async syncProfileSequence(): Promise<void> {
        const seqResult = await this.db.exeRaw(
            `SELECT pg_get_serial_sequence('security.profile', 'profile_id') AS seq_name`
        )

        const seqName = seqResult.rows[0]?.seq_name
        if (!seqName) return

        await this.db.exeRaw(
            `SELECT setval($1::regclass, COALESCE((SELECT MAX(profile_id) FROM security.profile), 0) + 1, false)`,
            [seqName]
        )

        console.log('   🔁 Profile sequence synced'.gray)
    }

    /**
     * Grants permissions to a profile for specific methods.
     * Uses NEW table: profile_method (not permission_methods)
     */
    async grantPermissions(profileId: number, methodIds: number[]): Promise<number> {
        let granted = 0
        for (const methodId of methodIds) {
            try {
                await this.db.exeRaw(
                    `INSERT INTO security.profile_method (profile_id, method_id) 
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [profileId, methodId]
                )
                granted++
            } catch (e) {
                // Ignore if already exists
            }
        }
        return granted
    }
}
