import { PartialInitConfig, InitConfig } from '../types.js'
import { DEFAULT_CONFIG } from '../core/defaults.js'

/**
 * CLI Argument Parser - Unified DB CLI
 */
export function parseCliArgs(
    argv: string[]
): PartialInitConfig & { action?: string; help?: boolean } {
    const opts: Record<string, string | boolean> = {}
    const positional: string[] = []

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a.startsWith('--')) {
            const key = a.slice(2)
            const next = argv[i + 1]
            if (next == null || next.startsWith('--')) {
                opts[key] = true
            } else {
                opts[key] = next
                i++
            }
        } else if (a.startsWith('-')) {
            // Short flags
            const key = a.slice(1)
            opts[key] = true
        } else {
            positional.push(a)
        }
    }

    // Helper to get opt by multiple names
    const getOpt = (...keys: string[]): string | boolean | undefined => {
        for (const k of keys) if (opts[k] !== undefined) return opts[k]
        return undefined
    }

    const getBool = (...keys: string[]): boolean | undefined => {
        const v = getOpt(...keys)
        if (v === true || v === 'true' || v === '1') return true
        if (v === false || v === 'false' || v === '0') return false
        return undefined
    }

    const getNum = (...keys: string[]): number | undefined => {
        const v = getOpt(...keys)
        if (typeof v === 'string') {
            const n = parseInt(v, 10)
            return Number.isFinite(n) ? n : undefined
        }
        return undefined
    }

    const getStr = (...keys: string[]): string | undefined => {
        const v = getOpt(...keys)
        return typeof v === 'string' ? v : undefined
    }

    const parseCsvList = (value: string | undefined): string[] | undefined => {
        if (!value) return undefined
        const items = value
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
        return items.length > 0 ? items : undefined
    }

    // Build config
    const config: PartialInitConfig & { action?: string; help?: boolean } = {
        app: {},
        db: {},
        auth: {},
        security: {},
    }

    // Help
    if (getBool('help', 'h')) config.help = true

    // Action (from positional or flags)
    if (positional[0]) {
        // Handle aliases
        const actionMap: Record<string, string> = { pull: 'introspect' }
        config.action = actionMap[positional[0]] || positional[0]
    }
    if (getBool('sync')) config.action = 'sync'
    if (getBool('introspect', 'pull')) config.action = 'introspect'
    if (getBool('seed')) config.action = 'seed'
    if (getBool('dml')) config.action = 'dml'
    if (getBool('reset')) config.action = 'reset'
    if (getBool('print')) config.action = 'print'
    if (getBool('apply')) config.action = 'apply'
    if (getBool('bo')) config.action = 'bo'
    if (getBool('manage')) config.action = 'manage'

    if (getBool('with-data', 'data')) config.security!.introspectData = true
    if (getBool('security-data')) config.security!.introspectSecurityData = true

    const includeTables = parseCsvList(getStr('includeTables', 'include-tables'))
    if (includeTables) config.security!.introspectIncludeTables = includeTables

    const excludeTables = parseCsvList(getStr('excludeTables', 'exclude-tables'))
    if (excludeTables) config.security!.introspectExcludeTables = excludeTables

    const securityDataTables = parseCsvList(
        getStr('securityDataTables', 'security-data-tables')
    )
    if (securityDataTables) {
        config.security!.introspectSecurityTables = securityDataTables
        config.security!.introspectSecurityData = true
    }

    // App options
    if (getBool('yes', 'y')) config.app!.interactive = false
    if (getBool('dry-run', 'dry')) config.app!.dryRun = true
    if (getBool('silent')) config.app!.silent = true
    const profile = getStr('profile', 'p')
    if (profile) config.app!.profile = profile

    // DB options
    const host = getStr('host', 'h')
    if (host) config.db!.host = host
    const port = getNum('port')
    if (port) config.db!.port = port
    const user = getStr('user', 'u')
    if (user) config.db!.user = user
    const password = getStr('password')
    if (password) config.db!.password = password
    const database = getStr('database', 'd')
    if (database) config.db!.database = database
    if (getBool('ssl')) config.db!.ssl = true

    // Auth options
    if (getBool('auth')) config.auth!.enabled = true
    if (getBool('authUsername') !== undefined)
        config.auth!.usernameSupported = getBool('authUsername')
    const authLoginId = getStr('authLoginId')
    // TODO(REVERT_NAMING): Revert user_na to username
    if (authLoginId === 'email' || authLoginId === 'user_na') config.auth!.loginId = authLoginId
    if (getBool('authLogin2StepNewDevice')) config.auth!.login2StepNewDevice = true

    // Security/Seeding options
    if (getBool('seedAdmin')) config.security!.seedAdmin = true
    const adminUser = getStr('adminUser')
    if (adminUser) config.security!.adminUser = adminUser
    const adminPassword = getStr('adminPassword')
    if (adminPassword) config.security!.adminPassword = adminPassword
    const profileId = getNum('profileId')
    if (profileId) config.security!.adminProfileId = profileId

    if (getBool('seedProfiles')) config.security!.seedProfiles = true
    const publicProfileId = getNum('publicProfileId')
    if (publicProfileId) config.security!.publicProfileId = publicProfileId
    const sessionProfileId = getNum('sessionProfileId')
    if (sessionProfileId) config.security!.sessionProfileId = sessionProfileId

    if (getBool('registerBo')) config.security!.registerBo = true
    const txStart = getNum('txStart')
    if (txStart) config.security!.txStart = txStart
    if (getBool('prune')) config.security!.pruneMethods = true

    if (getBool('seedPublicAuthPerms')) config.security!.seedPublicAuthPerms = true

    // Include email column
    if (getBool('includeEmail')) config.security!.includeEmail = true

    // Session table config
    const sessionSchema = getStr('sessionSchema')
    if (sessionSchema) config.security!.sessionSchema = sessionSchema
    const sessionTable = getStr('sessionTable')
    if (sessionTable) config.security!.sessionTable = sessionTable

    return config
}

/**
 * Prints CLI help text
 */
export function printHelp(): void {
    console.log(`
${'🚀 ToProc DB CLI'.green.bold} v2.0

${'Usage:'.cyan.bold}
  pnpm run db [action] [options]

${'Actions:'.cyan.bold}
  sync        Apply schemas to database (Code → DB) [default]
  introspect  Generate schemas from database (DB → Code)
  seed        Populate initial data (profiles, admin)
    dml         Apply only DML migrations (migrations/dml)
  bo          Sync BO methods (Code ↔ DB)
  manage      Manage security data interactively
  reset       Drop and recreate all tables
  print       Print SQL without executing

${'Introspect Options:'.cyan.bold}
  --data, --with-data Enable data export (INSERTs)
    --security-data     Include data export for security schema (no DDL)
    --security-data-tables <list>
                                            Include only these security tables (comma-separated)
    --include-tables <list>
                                            Only process these tables (table or schema.table)
    --exclude-tables <list>
                                            Skip these tables (table or schema.table)

${'App Options:'.cyan.bold}
  --yes, -y           Non-interactive mode (assume yes)
  --dry-run           Simulate without executing
  --profile <name>    Environment profile (development|production|testing)
  --silent            Suppress output

${'Database Options:'.cyan.bold}
  --host <host>       Database host
  --port <port>       Database port
  --user <user>       Database user
  --password <pw>     Database password
  --database <name>   Database name
  --ssl               Enable SSL

${'Auth Options:'.cyan.bold}
  --auth              Create auth support tables
  --authUsername      Keep username as identifier (default: true)
  --authLoginId       Login identifier: email|user_na
  --authLogin2StepNewDevice  Require verification on new device

${'Seeding Options:'.cyan.bold}
  --seedAdmin         Create admin user
  --adminUser <name>  Admin username (default: admin)
  --adminPassword <pw> Admin password (will be hashed)
  --profileId <id>    Admin profile ID (default: 1)

  --seedProfiles      Create default profiles
  --publicProfileId   Public profile ID (default: 2)
  --sessionProfileId  Session profile ID (default: 1)

  --registerBo        Auto-register BO methods
  --txStart <n>       Starting tx for new methods
  --prune             Prune orphaned methods (use with bo action)

  --seedPublicAuthPerms  Grant public auth permissions

${'Examples:'.cyan.bold}
  pnpm run db                     # Interactive mode
  pnpm run db sync --dry-run      # Preview sync
  pnpm run db introspect          # Generate from DB
    pnpm run db introspect --data --security-data
    pnpm run db introspect --data --security-data-tables profile,user_profile
    pnpm run db introspect --include-tables business.person,security.profile
  pnpm run db seed --seedAdmin    # Create admin user
    pnpm run db dml --yes           # Apply only DML migrations
  pnpm run db bo --prune          # Sync BOs and prune orphans
  pnpm run db reset --yes         # Drop all tables
`)
}
