import { Database } from '../core/db.js'
import bcrypt from 'bcrypt'
import colors from 'colors'

export interface AdminSeedOptions {
    username: string
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
        const { username, password, profileId } = options

        console.log(`\n👤 Seeding admin user: ${username}`.cyan)

        // Hash password
        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        // Ensure profile exists (using NEW schema: profile_id, profile_name)
        await this.db.exeRaw(
            "INSERT INTO security.profiles (profile_id, profile_name) VALUES ($1, 'admin') ON CONFLICT (profile_id) DO NOTHING",
            [profileId]
        )

        // Upsert user (using NEW schema: user_password instead of password_hash)
        const result = await this.db.exeRaw(
            `INSERT INTO security.users (username, user_email, user_password) 
             VALUES ($1, $1, $2) 
             ON CONFLICT (user_email) DO UPDATE SET user_password = EXCLUDED.user_password 
             RETURNING user_id`,
            [username, passwordHash]
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
