/**
 * Main Entry Point for the unified DB CLI v2.0
 * Full-featured CLI with interactive wizard, seeders, and BO registration.
 */
import 'dotenv/config'
import colors from 'colors'
import path from 'path'
import { fileURLToPath } from 'url'

import { Database } from './core/db.js'
import { MigrationRunner } from './core/MigrationRunner.js'
import { Introspector } from './core/introspector.js'
import { parseCliArgs, printHelp } from './cli/parser.js'
import { ConfigBuilder } from './core/config-builder.js'
import { Interactor } from './interactor/prompts.js'
import { AdminSeeder } from './seeders/admin.js'
import { ProfileSeeder } from './seeders/profiles.js'
import { BORegistrar } from './seeders/bo-register.js'
import { DatabaseResetter } from './seeders/resetter.js'
import { SecurityManager } from './seeders/security-manager.js'

// Setup paths for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type MenuAction = 'sync' | 'introspect' | 'seed' | 'bo' | 'reset' | 'print' | 'manage' | 'exit'

async function main() {
    console.log(colors.green(colors.bold('🚀 ToProc DB CLI')) + ' v2.0')

    // 1. Parse CLI Args
    const cliArgs = parseCliArgs(process.argv.slice(2))

    // Handle help
    if (cliArgs.help) {
        printHelp()
        process.exit(0)
    }

    // 2. Initial Config (Defaults + Profile + CLI)
    const builder = new ConfigBuilder()
    let config = await builder.buildBasic(cliArgs)

    // 3. Determine action
    let action: MenuAction = (cliArgs.action as MenuAction) || 'sync'

    // Interactive menu if no action specified
    if (!cliArgs.action && config.app.interactive && process.stdin.isTTY) {
        const interactor = new Interactor()
        await interactor.header()
        console.log(colors.cyan('\n📋 What would you like to do?\n'))

        const selected = await interactor.select(
            'Select action',
            [
                'sync       - Apply schemas to database (Code → DB)',
                'introspect - Generate schemas from database (DB → Code)',
                'seed       - Populate initial data (profiles, admin, BOs)',
                'bo         - Sync BO methods (register new, find orphans)',
                'manage     - Manage security data (users, profiles, menus...)',
                'reset      - Drop and recreate all tables',
                'exit       - Cancel',
            ],
            'sync'
        )

        action = selected.split(' ')[0].trim() as MenuAction
        interactor.close()
    }

    if (action === 'exit') {
        console.log('👋 Bye!')
        process.exit(0)
    }

    // 4. Run Interactive Wizard (Contextual)
    config = await builder.runWizard(config, cliArgs, action)

    // 5. Setup Database Connection

    // 5. Execute action
    const dbConfig = {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        ssl: config.db.ssl,
    }

    console.log(
        colors.gray(`🔌 Connecting to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`)
    )

    const db = new Database(dbConfig)
    const ddlDir = path.resolve(__dirname, '../../migrations/ddl')
    const dmlDir = path.resolve(__dirname, '../../migrations/dml')
    const boRoot = path.resolve(__dirname, '../../BO')

    const runnerConfig = {
        dryRun: config.app.dryRun,
        interactive: config.app.interactive,
        silent: config.app.silent,
        profile: config.app.profile,
    }

    try {
        switch (action) {
            case 'sync': {
                console.log(colors.cyan('\n🔄 Running Sync (Code → DB)...'))

                const runner = new MigrationRunner(db, runnerConfig, ddlDir)
                await runner.run()

                // Auto-register BOs if enabled
                if (config.security.registerBo) {
                    const registrar = new BORegistrar(db, boRoot)
                    await registrar.registerAll({
                        profileId: config.security.adminProfileId || 1,
                        txStart: config.security.txStart,
                    })
                }
                break
            }

            case 'introspect': {
                console.log(colors.cyan('\n🔍 Running Introspect (DB → Code)...'))
                const introspector = new Introspector(db, ddlDir, dmlDir)
                await introspector.introspectAll({
                    withData: config.security.introspectData,
                })
                break
            }

            case 'seed': {
                console.log(colors.cyan('\n🌱 Running Seed...'))

                // Run DML migrations first
                console.log(colors.cyan('\n📝 Applying DML Scripts (Migrations)...'))
                const dmlRunner = new MigrationRunner(db, runnerConfig, dmlDir)
                await dmlRunner.run()

                // Seed profiles first (if enabled)
                if (config.security.seedProfiles) {
                    const profileSeeder = new ProfileSeeder(db)
                    await profileSeeder.seed({
                        publicProfileId: config.security.publicProfileId || 2,
                        sessionProfileId: config.security.sessionProfileId || 1,
                        adminProfileId: config.security.adminProfileId || 1,
                    })
                }

                // Seed admin user
                if (config.security.seedAdmin) {
                    const adminSeeder = new AdminSeeder(db)
                    const password = config.security.adminPassword || AdminSeeder.generatePassword()

                    await adminSeeder.seed({
                        username: config.security.adminUser || 'admin',
                        password,
                        profileId: config.security.adminProfileId || 1,
                    })

                    // Print password if it was auto-generated
                    if (!config.security.adminPassword) {
                        console.log(colors.yellow(`\n⚠️  Generated admin password: ${password}`))
                        console.log(colors.gray('   (save this somewhere safe!)'))
                    }
                }

                // Register BOs
                if (config.security.registerBo) {
                    const registrar = new BORegistrar(db, boRoot)
                    await registrar.registerAll({
                        profileId: config.security.adminProfileId || 1,
                        txStart: config.security.txStart,
                    })
                }

                console.log(colors.green('\n✅ Seeding complete!'))
                break
            }

            case 'reset': {
                console.log(colors.red('\n🗑️  Running Reset...'))

                // Confirm if interactive
                let confirmed = !config.app.interactive
                if (config.app.interactive && process.stdin.isTTY) {
                    const interactor = new Interactor()
                    confirmed = await interactor.confirm(
                        'Are you SURE you want to DROP all tables? This cannot be undone!',
                        false
                    )
                    interactor.close()
                }

                if (confirmed) {
                    const resetter = new DatabaseResetter(db)
                    await resetter.reset({ confirm: true })

                    // Re-apply schemas
                    console.log(colors.cyan('\n🔄 Re-applying schemas (DDL)...'))
                    const ddlRunner = new MigrationRunner(db, runnerConfig, ddlDir)
                    await ddlRunner.run()

                    // Re-apply seeds
                    console.log(colors.cyan('\n🌱 Re-applying seeds (DML)...'))
                    const dmlRunner = new MigrationRunner(db, runnerConfig, dmlDir)
                    await dmlRunner.run()
                } else {
                    console.log(colors.yellow('   Cancelled.'))
                }
                break
            }

            case 'print': {
                console.log(colors.cyan('\n📜 Printing SQL (dry-run mode)...'))
                const runner = new MigrationRunner(db, { ...runnerConfig, dryRun: true }, ddlDir)
                await runner.run()
                break
            }

            case 'bo': {
                console.log(colors.cyan('\n📦 Running BO Sync (Code ↔ DB)...'))

                const registrar = new BORegistrar(db, boRoot)
                const result = await registrar.syncMethods({
                    profileId: config.security.adminProfileId || 1,
                    txStart: config.security.txStart,
                    prune: config.security.pruneMethods,
                    dryRun: config.app.dryRun,
                })

                if (result.orphaned.length > 0 && config.app.interactive && !config.security.pruneMethods && !config.app.dryRun) {
                    const interactor = new Interactor()
                    const prune = await interactor.confirm(
                        `Found ${result.orphaned.length} orphaned methods in DB. Prune them?`,
                        false
                    )
                    interactor.close()

                    if (prune) {
                        console.log(colors.cyan('\n🗑️  Pruning orphaned methods...'))
                        await registrar.executePrune(result.orphaned.map((m) => m.methodId))
                        result.pruned = result.orphaned.length
                        console.log(colors.green(`   ✅ Pruned ${result.pruned} methods.`))
                    }
                }

                console.log(colors.green(`\n✅ BO Sync complete!`))
                console.log(colors.gray(`   Methods registered: ${result.added}`))
                console.log(colors.gray(`   Methods pruned: ${result.pruned}`))
                console.log(colors.gray(`   Orphans found: ${result.orphaned.length}`))
                break
            }

            case 'manage': {
                console.log(colors.cyan('\n🔐 Security Manager...'))
                const manager = new SecurityManager(db)
                await manager.run()
                break
            }

            default:
                console.log('👋 Done.')
        }
    } catch (e: any) {
        console.error(colors.red('🔥 Fatal Error:'), e.message)
        if (process.env.DEBUG) console.error(e.stack)
        process.exit(1)
    } finally {
        await db.close()
        console.log('👋 Done.')
        process.exit(0)
    }
}

main()
