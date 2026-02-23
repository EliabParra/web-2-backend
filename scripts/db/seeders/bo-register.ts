import { Database } from '../core/db.js'
import fs from 'node:fs/promises'
import path from 'path'
import colors from 'colors'

interface BOMethod {
    name: string
    tx?: number
}

interface BOInfo {
    objectName: string
    methods: BOMethod[]
}

/**
 * Registers Business Objects and their methods into security tables.
 * Updated for new schema: uses object_method and transactions tables
 */
export class BORegistrar {
    constructor(
        private db: Database,
        private boRoot: string
    ) {}

    /**
     * Discovers all BOs in the BO directory.
     */
    async discoverBOs(): Promise<BOInfo[]> {
        const bos: BOInfo[] = []

        try {
            const entries = await fs.readdir(this.boRoot, { withFileTypes: true })

            for (const entry of entries) {
                if (!entry.isDirectory()) continue

                const objectName = entry.name
                const boFilePath = path.join(this.boRoot, objectName, `${objectName}BO.ts`)

                try {
                    await fs.access(boFilePath)
                    const content = await fs.readFile(boFilePath, 'utf-8')
                    const methods = this.parseAsyncMethods(content)

                    if (methods.length > 0) {
                        bos.push({ objectName, methods: methods.map((name) => ({ name })) })
                    }
                } catch {
                    // BO file doesn't exist, skip
                }
            }
        } catch {
            // BO directory doesn't exist
        }

        return bos
    }

    /**
     * Parses async method names from a TypeScript BO file.
     */
    private parseAsyncMethods(content: string): string[] {
        const methods: string[] = []
        const regex = /\basync\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(content)) !== null) {
            const name = match[1]
            if (name && name !== 'constructor' && !name.startsWith('_')) {
                methods.push(name)
            }
        }

        return [...new Set(methods)] // Remove duplicates
    }

    /**
     * Registers all discovered BOs and their methods.
     */
    async registerAll(options: {
        profileId: number
        txStart?: number
    }): Promise<{ registered: number; bos: string[] }> {
        console.log(`\n📦 Registering Business Objects...`.cyan)

        // Verify profile exists before starting
        const profileExists = await this.checkProfileExists(options.profileId)
        if (!profileExists) {
            console.log(`   ❌ Error: Profile ID ${options.profileId} does not exist.`.red)
            console.log(
                `      Run 'pnpm run db seed --seedProfiles' first to initialize default profiles.`
                    .gray
            )
            throw new Error(`Profile ID ${options.profileId} not found.`)
        }

        const bos = await this.discoverBOs()

        if (bos.length === 0) {
            console.log(`   ⚠️  No BOs found in ${this.boRoot}`.yellow)
            return { registered: 0, bos: [] }
        }

        console.log(
            `   📊 Found ${bos.length} BOs: ${bos.map((b) => b.objectName).join(', ')}`.gray
        )

        // Get next available tx from transactions table
        let nextTx = options.txStart ?? (await this.getNextTx())
        let registered = 0
        const boNames: string[] = []

        for (const bo of bos) {
            const objectId = await this.upsertObject(bo.objectName)

            for (const method of bo.methods) {
                const { methodId, tx } = await this.upsertMethod(objectId, method.name, nextTx)
                await this.grantPermission(options.profileId, methodId)
                registered++
                nextTx = Math.max(nextTx + 1, tx + 1)
            }

            boNames.push(bo.objectName)
            console.log(`   ✅ ${bo.objectName}: ${bo.methods.length} methods`.green)
        }

        console.log(`\n   📊 Total methods registered: ${registered}`.gray)
        return { registered, bos: boNames }
    }

    /**
     * Gets next TX number from transactions table
     */
    private async getNextTx(): Promise<number> {
        const result = await this.db.exeRaw(
            'SELECT COALESCE(MAX(transaction_number::integer), 0) + 1 AS next_tx FROM security.transactions'
        )
        return Number(result.rows[0]?.next_tx) || 1
    }

    private async checkProfileExists(profileId: number): Promise<boolean> {
        const result = await this.db.exeRaw(
            'SELECT 1 FROM security.profiles WHERE profile_id = $1',
            [profileId]
        )
        return (result.rowCount ?? 0) > 0
    }

    private async upsertObject(objectName: string): Promise<number> {
        // First check if object exists to avoid sequence increment on CONFLICT
        const existing = await this.db.exeRaw(
            'SELECT object_id FROM security.objects WHERE object_name = $1',
            [objectName]
        )
        if (existing.rows[0]?.object_id) {
            return existing.rows[0].object_id
        }

        const result = await this.db.exeRaw(
            `INSERT INTO security.objects (object_name) VALUES ($1) RETURNING object_id`,
            [objectName]
        )
        return result.rows[0]?.object_id
    }

    /**
     * Upserts a method and creates object_method and transaction links
     */
    private async upsertMethod(
        objectId: number,
        methodName: string,
        tx: number
    ): Promise<{ methodId: number; tx: number }> {
        // 1. Check if method already exists
        const existingMethod = await this.db.exeRaw(
            'SELECT method_id FROM security.methods WHERE method_name = $1',
            [methodName]
        )
        let methodId = existingMethod.rows[0]?.method_id

        // If no method exists, insert it
        if (!methodId) {
            const methodResult = await this.db.exeRaw(
                `INSERT INTO security.methods (method_name) VALUES ($1) RETURNING method_id`,
                [methodName]
            )
            methodId = methodResult.rows[0]?.method_id
        }

        // 2. Link object to method (object_method table)
        const existingLink = await this.db.exeRaw(
            'SELECT object_method_id FROM security.object_method WHERE object_id = $1 AND method_id = $2',
            [objectId, methodId]
        )
        if (!existingLink.rows[0]?.object_method_id) {
            await this.db.exeRaw(
                `INSERT INTO security.object_method (object_id, method_id) VALUES ($1, $2)`,
                [objectId, methodId]
            )
        }

        // 3. Create or get transaction entry
        const existingTx = await this.db.exeRaw(
            `SELECT transaction_number FROM security.transactions 
             WHERE method_id = $1 AND object_id = $2`,
            [methodId, objectId]
        )

        let finalTx = tx
        if (existingTx.rows[0]?.transaction_number) {
            finalTx = Number(existingTx.rows[0].transaction_number)
        } else {
            await this.db.exeRaw(
                `INSERT INTO security.transactions (transaction_number, method_id, object_id) VALUES ($1, $2, $3)`,
                [tx.toString(), methodId, objectId]
            )
        }

        return { methodId, tx: finalTx }
    }

    private async grantPermission(profileId: number, methodId: number): Promise<void> {
        const existingPerm = await this.db.exeRaw(
            'SELECT profile_method_id FROM security.profile_method WHERE profile_id = $1 AND method_id = $2',
            [profileId, methodId]
        )
        if (!existingPerm.rows[0]?.profile_method_id) {
            await this.db.exeRaw(
                `INSERT INTO security.profile_method (profile_id, method_id) VALUES ($1, $2)`,
                [profileId, methodId]
            )
        }
    }

    /**
     * Syncs methods between code and database.
     */
    async syncMethods(options: {
        profileId: number
        txStart?: number
        prune?: boolean
        dryRun?: boolean
    }): Promise<{
        added: number
        pruned: number
        orphaned: Array<{ methodId: number; objectName: string; methodName: string; tx: number }>
    }> {
        console.log(`\n🔄 Syncing Business Objects...`.cyan)

        const codeBOs = await this.discoverBOs()
        const dbMethods = await this.getDBMethods()

        // Build a set of "object.method" from code
        const codeMethodSet = new Set<string>()
        for (const bo of codeBOs) {
            for (const method of bo.methods) {
                codeMethodSet.add(`${bo.objectName}.${method.name}`)
            }
        }

        // Find orphaned methods (in DB but not in code)
        const orphaned = dbMethods.filter(
            (m) => !codeMethodSet.has(`${m.objectName}.${m.methodName}`)
        )

        // Register all methods from code (upsert)
        let added = 0
        if (!options.dryRun) {
            const result = await this.registerAll({
                profileId: options.profileId,
                txStart: options.txStart,
            })
            added = result.registered
        } else {
            console.log(`   📋 Dry run - would register methods from ${codeBOs.length} BOs`.gray)
            for (const bo of codeBOs) {
                console.log(`      • ${bo.objectName}: ${bo.methods.length} methods`.gray)
            }
        }

        // Report orphaned methods
        if (orphaned.length > 0) {
            console.log(
                `\n   ⚠️  Found ${orphaned.length} orphaned methods (in DB but not in code):`.yellow
            )
            for (const m of orphaned) {
                console.log(`      • ${m.objectName}.${m.methodName} (tx: ${m.tx})`.yellow)
            }

            if (options.prune && !options.dryRun) {
                console.log(`\n   🗑️  Pruning orphaned methods...`.red)
                for (const m of orphaned) {
                    await this.deleteMethod(m.methodId)
                    console.log(`      ✅ Deleted ${m.objectName}.${m.methodName}`.red)
                }
            } else if (options.prune && options.dryRun) {
                console.log(`   📋 Dry run - would delete ${orphaned.length} methods`.gray)
            } else {
                console.log(`   ℹ️  Use --prune to delete orphaned methods`.blue)
            }
        } else {
            console.log(`\n   ✅ No orphaned methods found - DB is in sync with code`.green)
        }

        return {
            added,
            pruned: options.prune && !options.dryRun ? orphaned.length : 0,
            orphaned: orphaned.map((m) => ({
                methodId: m.methodId,
                objectName: m.objectName,
                methodName: m.methodName,
                tx: m.tx,
            })),
        }
    }

    /**
     * Delete multiple methods directly by their IDs
     */
    async executePrune(methodIds: number[]): Promise<void> {
        for (const id of methodIds) {
            await this.deleteMethod(id)
        }
    }

    /**
     * Gets all methods currently registered in the database.
     * Uses object_method and transactions tables for the join
     */
    private async getDBMethods(): Promise<
        Array<{ methodId: number; objectName: string; methodName: string; tx: number }>
    > {
        const result = await this.db.exeRaw(`
            SELECT 
                m.method_id, 
                o.object_name, 
                m.method_name, 
                COALESCE(t.transaction_number::integer, 0) as tx
            FROM security.methods m
            JOIN security.object_method om ON om.method_id = m.method_id
            JOIN security.objects o ON o.object_id = om.object_id
            LEFT JOIN security.transactions t ON t.method_id = m.method_id AND t.object_id = om.object_id
            ORDER BY o.object_name, m.method_name
        `)

        return result.rows.map((row: any) => ({
            methodId: row.method_id,
            objectName: row.object_name,
            methodName: row.method_name,
            tx: Number(row.tx),
        }))
    }

    /**
     * Deletes a method and its associated permissions.
     */
    private async deleteMethod(methodId: number): Promise<void> {
        // Delete permissions
        await this.db.exeRaw('DELETE FROM security.profile_method WHERE method_id = $1', [methodId])
        // Delete object_method links
        await this.db.exeRaw('DELETE FROM security.object_method WHERE method_id = $1', [methodId])
        // Delete transactions
        await this.db.exeRaw('DELETE FROM security.transactions WHERE method_id = $1', [methodId])
        // Delete the method
        await this.db.exeRaw('DELETE FROM security.methods WHERE method_id = $1', [methodId])
    }
}
