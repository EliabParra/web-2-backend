import { Context } from '../core/ctx.js'
import { Interactor } from '../interactor/ui.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import colors from 'colors'

interface Profile {
    profileId: number
    profileName: string
}

interface MethodInfo {
    methodId: number
    methodName: string
}

// In-memory state for deferred saving
type PermissionState = Map<number, Set<number>> // MethodId -> Set<ProfileId>

/**
 * Permission management command
 */
export class PermsCommand {
    private interactor: Interactor

    constructor(private ctx: Context) {
        this.interactor = new Interactor()
    }

    async run(objectName?: string, opts: any = {}) {
        // Handle Dry Run / Non-interactive mode from flags
        if (opts.allow || opts.deny) {
            this.handleLegacyFlags(objectName, opts)
            return
        }

        this.interactor.header()

        // 1. Select BO
        if (!objectName) {
            const bos = await this.listBOs()
            if (bos.length === 0) {
                this.interactor.warn('No BOs found')
                return
            }
            objectName = await this.interactor.select('Select a BO to manage permissions', bos)
        }

        // 2. Manage Permissions Loop
        await this.managePermissions(objectName)
        this.interactor.close()
    }

    private handleLegacyFlags(objectName: string | undefined, opts: any) {
        const profile = Number(opts.profile)
        if (!opts.profile || isNaN(profile) || profile <= 0) {
            console.error('--profile must be a positive integer')
            process.exit(1)
        }

        // Validate method format (BO.method)
        const methods = (opts.allow || opts.deny || '').split(',').filter((m: string) => m.trim())
        for (const m of methods) {
            if (!m.includes('.')) {
                console.error(`Invalid method format: ${m}. Expected: BO.methodName`)
                process.exit(1)
            }
        }

        console.log('Legacy flags not fully supported in new interactive mode refactor yet.')
    }

    private async managePermissions(objectName: string) {
        console.log(`\n🔐 Loading permissions for ${objectName}BO...`.gray)

        await this.ctx.ensureGlobals()

        const { Database } = await import('../../db/core/db.js')

        const db = new Database({
            host: process.env.PGHOST || 'localhost',
            port: Number(process.env.PGPORT) || 5432,
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || '',
            database: process.env.PGDATABASE || 'toproc',
        })

        try {
            // 1. Load Data
            const profiles = await this.getProfiles(db)
            if (profiles.length === 0) return

            const objectId = await this.getObjectId(db, objectName)
            if (!objectId) return

            const methods = await this.getMethods(db, objectId)
            if (methods.length === 0) {
                this.interactor.warn(`No methods found for ${objectName}BO`)
                return
            }

            // 2. Build Initial State (In-Memory)
            const currentPerms = await this.getPermissions(db, objectId)
            const state: PermissionState = new Map()

            // Populate state
            for (const m of methods) {
                const existing = currentPerms.find((p: any) => p.method_id === m.methodId)
                const profileIds = existing ? existing.profile_ids : []
                state.set(m.methodId, new Set(profileIds))
            }

            // 3. Interaction Loop
            let dirty = false
            while (true) {
                console.clear()
                this.interactor.header()
                
                if (dirty) {
                    console.log(colors.yellow('⚠️  Unsaved changes'))
                }
                this.interactor.info(`Editing Permissions: ${objectName}BO`)

                this.printPermissionMatrix(methods, profiles, state)

                console.log(`\n💡 Actions:`)
                console.log(`   1-${methods.length}   Toggle permissions (comma separated, e.g. "1, 3")`)
                console.log(`   ${colors.green(colors.bold('s'))}     Save & Exit`)
                console.log(`   ${colors.red('x')}     Cancel / Exit without saving\n`)

                const answer = await this.interactor.ask('Action')
                const choice = answer.trim().toLowerCase()

                if (choice === 's') {
                    if (dirty) {
                        await this.saveChanges(db, state, objectId)
                    } else {
                        this.interactor.info('No changes to save.')
                    }
                    break
                } else if (choice === 'x') {
                    if (dirty) {
                        const confirm = await this.interactor.confirm('Discard unsaved changes?', false)
                        if (!confirm) continue
                    }
                    this.interactor.info('Changes discarded.')
                    break
                } else {
                    // Try parsing numbers
                    const indices = choice
                        .split(',')
                        .map((s) => parseInt(s.trim()) - 1)
                        .filter((i) => !isNaN(i))

                    if (indices.length > 0) {
                        // Validate indices
                        const validInfo = indices.every((i) => i >= 0 && i < methods.length)
                        if (!validInfo) {
                            this.interactor.error('Invalid method numbers selected.')
                            await this.wait()
                            continue
                        }

                        // Ask for Profile to toggle
                        const profileOptions = profiles.map(p => ({ label: p.profileName, value: String(p.profileId) }))
                        const profileIdStr = await this.interactor.select('Select Profile to toggle for selected methods:', profileOptions)
                        
                        // Apply toggle
                        let changesCount = 0
                        const profileId = Number(profileIdStr)
                        for (const mIdx of indices) {
                            const methodId = methods[mIdx].methodId
                            const pSet = state.get(methodId)!
                            if (pSet.has(profileId)) {
                                pSet.delete(profileId)
                            } else {
                                pSet.add(profileId)
                            }
                            changesCount++
                        }
                        if (changesCount > 0) dirty = true
                    }
                }
            }
        } catch (e) {
            console.error(e)
            this.interactor.error('An error occurred managing permissions.')
        } finally {
            await db.close()
        }
    }

    private async wait() {
        await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // --- Data Fetching Helpers ---

    private async getProfiles(db: any): Promise<Profile[]> {
        const res = await db.exeRaw(
            `SELECT profile_id, profile_name FROM security.profiles ORDER BY profile_id`
        )
        return res.rows.map((r: any) => ({ profileId: r.profile_id, profileName: r.profile_name }))
    }

    private async getObjectId(db: any, name: string): Promise<number | null> {
        const res = await db.exeRaw(
            `SELECT object_id FROM security.objects WHERE object_name = $1`,
            [name]
        )
        if (res.rows.length === 0) {
            this.interactor.warn(`BO "${name}" not registered. Run 'pnpm run bo sync ${name}'`)
            return null
        }
        return res.rows[0].object_id
    }

    private async getMethods(db: any, objectId: number): Promise<MethodInfo[]> {
        const res = await db.exeRaw(
            `
            SELECT m.method_id, m.method_name 
            FROM security.methods m
            INNER JOIN security.object_method om ON m.method_id = om.method_id
            WHERE om.object_id = $1 
            ORDER BY m.method_name
            `,
            [objectId]
        )
        return res.rows.map((r: any) => ({
            methodId: r.method_id,
            methodName: r.method_name,
        }))
    }

    private async getPermissions(db: any, objectId: number): Promise<any[]> {
        const res = await db.exeRaw(
            `
            SELECT m.method_id, 
                   COALESCE(array_agg(pm.profile_id) FILTER (WHERE pm.profile_id IS NOT NULL), '{}') as profile_ids
            FROM security.methods m
            INNER JOIN security.object_method om ON m.method_id = om.method_id
            LEFT JOIN security.profile_method pm ON pm.method_id = m.method_id
            WHERE om.object_id = $1
            GROUP BY m.method_id
        `,
            [objectId]
        )
        return res.rows
    }

    // --- State Management ---

    private async saveChanges(db: any, state: PermissionState, objectId: number) {
        this.interactor.startSpinner('Saving changes...')

        try {

            const methodIds = Array.from(state.keys())
            if (methodIds.length > 0) {
                const params = methodIds.map((_, i) => `$${i + 1}`).join(',')
                await db.exeRaw(
                    `DELETE FROM security.profile_method WHERE method_id IN (${params})`,
                    methodIds
                )
            }

            for (const [methodId, profileSet] of state.entries()) {
                for (const profileId of profileSet) {
                    await db.exeRaw(
                        `INSERT INTO security.profile_method (profile_id, method_id) VALUES ($1, $2)`,
                        [profileId, methodId]
                    )
                }
            }

            await db.exeRaw('COMMIT')
            this.interactor.stopSpinner(true)
            this.interactor.success('Permissions saved successfully!')
        } catch (e) {
            await db.exeRaw('ROLLBACK')
            this.interactor.stopSpinner(false)
            console.error(e)
            this.interactor.error('Failed to save changes.')
        }
    }

    // --- Render ---

    private printPermissionMatrix(
        methods: MethodInfo[],
        profiles: Profile[],
        state: PermissionState
    ) {
        const headers = ['#', 'Method', ...profiles.map(p => p.profileName)]
        
        const rows = methods.map((m, idx) => {
            const activeProfiles = state.get(m.methodId) || new Set()
            const row = [
                String(idx + 1),
                m.methodName,
                ...profiles.map(p => activeProfiles.has(p.profileId) ? '✅' : '❌')
            ]
            return row
        })

        this.interactor.table(headers, rows)
    }

    private async listBOs(): Promise<string[]> {
        const boRoot = path.join(this.ctx.config.rootDir, 'BO')
        try {
            const entries = await fs.readdir(boRoot, { withFileTypes: true })
            return entries.filter((e) => e.isDirectory()).map((e) => e.name)
        } catch {
            return []
        }
    }
}
