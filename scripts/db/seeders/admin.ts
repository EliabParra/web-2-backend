import { Database } from '../core/db.js'
import bcrypt from 'bcrypt'
import colors from 'colors'

// TODO(REVERT_NAMING): Revert user_na to username
export interface AdminSeedOptions {
    user_na: string
    password: string
    profileId: number
}

/**
 * Seeds an admin user with a hashed password.
 */
export class AdminSeeder {
    constructor(private db: Database) {}

    /**
     * Creates or updates an admin user and links to profile.
     */
    async seed(options: AdminSeedOptions): Promise<{ userId: number; profileId: number }> {
        // TODO(REVERT_NAMING): Revert user_na to username, user_pw to user_password, profile_na to profile_name
        const { user_na, password, profileId } = options

        console.log(`\n👤 Seeding admin user: ${user_na}`.cyan)

        // Hash password
        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        // Ensure profile exists
        await this.db.exeRaw(
            "INSERT INTO security.profile (profile_id, profile_na) VALUES ($1, 'admin') ON CONFLICT (profile_id) DO NOTHING",
            [profileId]
        )

        // Upsert user
        const result = await this.db.exeRaw(
            `INSERT INTO security."user" (user_na, user_pw) 
             VALUES ($1, $2) 
             ON CONFLICT (user_na) DO UPDATE SET user_pw = EXCLUDED.user_pw 
             RETURNING user_id`,
            [user_na, passwordHash]
        )
        const userId = result.rows[0]?.user_id

        if (!userId) throw new Error('Failed to create admin user')

        // Link user to profile (using NEW table name: user_profile singular)
        await this.db.exeRaw(
            `INSERT INTO security.user_profile (user_id, profile_id) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id, profile_id) DO NOTHING`,
            [userId, profileId]
        )

        console.log(
            `   ✅ Admin user created/updated (user_id=${userId}, profile_id=${profileId})`.green
        )

        return { userId, profileId }
    }

    /**
     * Generates a random secure password.
     */
    static generatePassword(length = 16): string {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()'
        let password = ''
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return password
    }
}
