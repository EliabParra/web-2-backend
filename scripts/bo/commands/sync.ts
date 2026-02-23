import { Context } from '../core/ctx.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseMethodsFromBO } from '../templates/bo.js'
import 'colors'

interface SyncOptions {
    all?: boolean
    isDryRun?: boolean
    prune?: boolean
    profileId?: number
}

interface MethodInfo {
    name: string
    status: 'exists' | 'new' | 'orphan'
    tx?: number
}

/**
 * Sync command - synchronizes BO methods with database
 */
export class SyncCommand {
    constructor(private ctx: Context) {}

    async run(objectName: string | undefined, opts: SyncOptions = {}) {
        const profileId = opts.profileId ?? 1

        if (opts.all) {
            await this.syncAll(opts)
            return
        }

        if (!objectName) {
            // Interactive mode
            if (this.ctx.config.isInteractive) {
                const bos = await this.discoverBOs()
                const { Interactor } = await import('../interactor/ui.js')
                const ui = new Interactor()

                if (bos.length === 0) {
                    ui.warn('No BOs found in BO/ directory')
                    return
                }

                const options = ['[Sync All]', ...bos.map((b) => b.objectName), '[Cancel]']
                const selection = await ui.select('Select BO to sync', options)

                if (selection === '[Cancel]') return
                if (selection === '[Sync All]') {
                    opts.all = true
                    await this.syncAll(opts)
                } else {
                    await this.syncOne(selection, opts)
                }
                return
            }

            // List available BOs (Non-interactive fallback)
            const bos = await this.discoverBOs()
            const { Interactor } = await import('../interactor/ui.js')
            const ui = new Interactor()

            if (bos.length === 0) {
                ui.warn('No BOs found in BO/ directory')
                return
            }

            ui.info(`Available BOs: ${bos.map(b => b.objectName).join(', ')}`)
            console.log(`Run: ${'pnpm run bo sync <Name>'.bold} or ${'pnpm run bo sync --all'.bold}`)
            return
        }

        await this.syncOne(objectName, opts)
    }

    private async syncOne(objectName: string, opts: SyncOptions) {
        const boDir = path.join(this.ctx.config.rootDir, 'BO', objectName)
        const boPath = path.join(boDir, `${objectName}BO.ts`)
        const { Interactor } = await import('../interactor/ui.js')
        const ui = new Interactor()

        try {
            await fs.access(boPath)
        } catch {
            ui.error(`BO not found: ${boPath}`)
            return
        }

        ui.divider()
        ui.info(`Syncing ${objectName}BO`)

        // Parse methods from code
        const content = await fs.readFile(boPath, 'utf-8')
        const methods = parseMethodsFromBO(content)

        ui.step(`Scanned ${objectName}BO.ts (Found ${methods.length} methods)`, 'done')

        if (opts.isDryRun) {
            ui.info(`Dry run - would sync:`)
            this.printMethodsTable(methods.map((m) => ({ name: m, status: 'new' as const })), ui)
            return
        }

        // Connect to DB and sync
        await this.ctx.ensureGlobals()

        const { BORegistrar } = await import('../../db/seeders/bo-register.js')
        const { Database } = await import('../../db/core/db.js')

        const db = new Database({
            host: process.env.PGHOST || 'localhost',
            port: Number(process.env.PGPORT) || 5432,
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || '',
            database: process.env.PGDATABASE || 'toproc',
        })

        try {
            const registrar = new BORegistrar(db, path.join(this.ctx.config.rootDir, 'BO'))

            ui.startSpinner('Syncing with DB...')
            const result = await registrar.syncMethods({
                profileId: opts.profileId ?? 1,
                prune: opts.prune,
                dryRun: false,
            })
            ui.stopSpinner(true)

            ui.success(`Sync complete!`)
            ui.step(`Methods registered: ${result.added}`, 'done')
            if (result.pruned > 0) {
                ui.step(`Methods pruned: ${result.pruned}`, 'done')
            }
            if (result.orphaned.length > 0 && !opts.prune) {
                ui.warn(`Orphaned methods: ${result.orphaned.length} (Run with --prune to remove them)`)
            }
        } finally {
            await db.close()
        }
    }

    private async syncAll(opts: SyncOptions) {
        const { Interactor } = await import('../interactor/ui.js')
        const ui = new Interactor()
        
        ui.divider()
        ui.info('Syncing ALL Business Objects')

        const bos = await this.discoverBOs()

        if (bos.length === 0) {
            ui.warn('No BOs found')
            return
        }

        ui.step(`Found ${bos.length} BOs (${bos.reduce((acc, bo) => acc + bo.methods.length, 0)} methods in total)`, 'done')

        if (opts.isDryRun) {
            ui.info(`Dry run - would sync all ${bos.length} BOs`)
            return
        }

        await this.ctx.ensureGlobals()

        const { BORegistrar } = await import('../../db/seeders/bo-register.js')
        const { Database } = await import('../../db/core/db.js')

        const db = new Database({
            host: process.env.PGHOST || 'localhost',
            port: Number(process.env.PGPORT) || 5432,
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || '',
            database: process.env.PGDATABASE || 'toproc',
        })

        try {
            const registrar = new BORegistrar(db, path.join(this.ctx.config.rootDir, 'BO'))

            ui.startSpinner('Syncing all BOs with DB...')
            const result = await registrar.syncMethods({
                profileId: opts.profileId ?? 1,
                prune: opts.prune,
                dryRun: false,
            })
            ui.stopSpinner(true)

            ui.success('All BOs synced!')
            ui.step(`Methods registered: ${result.added}`, 'done')
            if (result.orphaned.length > 0) {
                ui.warn(`Orphaned methods: ${result.orphaned.length}`)
            }
        } finally {
            await db.close()
        }
    }

    private async discoverBOs(): Promise<{ objectName: string; methods: string[] }[]> {
        const boRoot = path.join(this.ctx.config.rootDir, 'BO')
        const bos: { objectName: string; methods: string[] }[] = []

        try {
            const entries = await fs.readdir(boRoot, { withFileTypes: true })

            for (const entry of entries) {
                if (!entry.isDirectory()) continue

                const objectName = entry.name
                const boFilePath = path.join(boRoot, objectName, `${objectName}BO.ts`)

                try {
                    await fs.access(boFilePath)
                    const content = await fs.readFile(boFilePath, 'utf-8')
                    const methods = parseMethodsFromBO(content)

                    if (methods.length > 0) {
                        bos.push({ objectName, methods })
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

    private printMethodsTable(methods: MethodInfo[], ui: any) {
        const rows = methods.map((m) => [
            m.name,
            m.status === 'exists' ? '✅ exists' : m.status === 'new' ? '🆕 new' : '🗑️ orphan',
            m.tx ? String(m.tx) : '—'
        ])

        ui.table(['Method', 'Status', 'TX'], rows)
    }
}
