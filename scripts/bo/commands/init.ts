import { Context } from '../core/ctx.js'
import { Interactor } from '../interactor/ui.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import colors from 'colors'

interface InitOptions {
    isDryRun?: boolean
}

/**
 * Init command - project setup wizard
 */
export class InitCommand {
    private interactor: Interactor

    constructor(private ctx: Context) {
        this.interactor = new Interactor()
    }

    async run(opts: InitOptions = {}) {
        this.interactor.divider()
        this.interactor.info('🚀 ToProccess BO Setup Wizard')

        // Check if BO directory exists
        const boRoot = path.join(this.ctx.config.rootDir, 'BO')
        let boExists = false
        try {
            await fs.access(boRoot)
            boExists = true
        } catch {}

        if (boExists) {
            const entries = await fs.readdir(boRoot, { withFileTypes: true })
            const boCount = entries.filter((e) => e.isDirectory()).length

            if (boCount > 0) {
                this.interactor.info(`Found ${boCount} existing BO(s) in BO/`)
            }
        }

        // Step 1: Create initial BO
        this.interactor.step('Step 1: Create your first Business Object', 'pending')

        const createFirst = await this.interactor.confirm('Create a new BO now?', true)

        if (createFirst) {
            const name = await this.interactor.ask('BO name (PascalCase)', 'Product')

            if (!name) {
                this.interactor.warn('Name required')
                return
            }

            // Choose preset
            const presetOptions = [
                { label: '1. CRUD (get, getAll, create, update, delete)', value: '1' },
                { label: '2. ReadOnly (get, getAll)', value: '2' },
                { label: '3. Minimal (get)', value: '3' },
                { label: '4. Empty (No methods)', value: 'empty' },
                { label: '5. Custom', value: 'custom' }
            ]

            const preset = await this.interactor.select('Choose a preset:', presetOptions)

            let methods: string[]
            switch (preset) {
                case '1':
                    methods = ['get', 'getAll', 'create', 'update', 'delete']
                    break
                case '2':
                    methods = ['get', 'getAll']
                    break
                case '3':
                    methods = ['get']
                    break
                case 'empty':
                    methods = []
                    break
                case 'custom':
                    const custom = await this.interactor.ask(
                        'Methods (comma-separated)',
                        'get,getAll,create,update,delete'
                    )
                    methods = custom
                        .split(',')
                        .map((m) => m.trim())
                        .filter((m) => m)
                    break
                default:
                    methods = ['get', 'getAll', 'create', 'update', 'delete']
            }

            if (opts.isDryRun) {
                this.interactor.info('Dry run - would create:')
                this.interactor.table(['Directory', 'Contents'], [
                    [`BO/${name}/`, `${name}BO.ts, ${name}Service.ts... (9 files)`]
                ])
            } else {
                // Import and run new command
                const { NewCommand } = await import('./new.js')
                await new NewCommand(this.ctx).run(name, { methods: methods.join(',') })
            }
        }

        // Step 2: Database setup reminder
        this.interactor.step('Step 2: Database Setup', 'pending')
        console.log('   Make sure your database is configured:')
        console.log('   1. Set environment variables (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD)')
        console.log(`   2. Initialize database: ${colors.bold('pnpm run db')}\n`)

        // Step 3: Sync methods
        this.interactor.step('Step 3: Register BO Methods', 'pending')
        console.log('   After creating BOs, sync them to the database:')
        console.log(`   ${colors.bold('pnpm run bo sync --all')}\n`)

        // Step 4: Set permissions
        this.interactor.step('Step 4: Configure Permissions', 'pending')
        console.log('   Manage permissions for each BO:')
        console.log(`   ${colors.bold('pnpm run bo perms <Name>')}\n`)

        // Summary
        this.interactor.success('Setup complete! Quick reference:')

        const summaryRows = [
            ['pnpm run bo new <Name>', 'Create new BO'],
            ['pnpm run bo list', 'List all BOs'],
            ['pnpm run bo sync --all', 'Sync methods to DB'],
            ['pnpm run bo perms <Name>', 'Manage permissions'],
            ['pnpm run bo analyze', 'Health check'],
            ['pnpm run bo auth', 'Generate Auth']
        ]
        this.interactor.table(['Command', 'Description'], summaryRows)
    }
}
