import test from 'node:test'
import assert from 'node:assert/strict'
import { SecurityService } from '../src/services/SecurityService.js'
import { MenuProvider } from '../src/core/security/MenuProvider.js'
import { withGlobals } from './_helpers/global-state.mjs'
import { createMockContainer } from './_helpers/mock-container.mjs'

/*
 * Mock DB that simulates security tables for MenuProvider
 */
function createMockDB() {
    // In-memory tables for the mock DB to persist state during the test run
    // This allows us to test inter-dependent operations (Create -> Assign -> View)
    const tables = {
        subsystems: [],
        menus: [],
        options: [],
        menu_option: [],
        profile_subsystem: [],
        profile_menu: [],
        profile_option: [],
        profile_method: [],
    }

    let idCounter = 100

    return {
        query: async (sql, params = []) => {
            // --- LOAD Queries (SELECT) ---
            if (sql.includes('SELECT subsystem_id')) return { rows: tables.subsystems }
            if (sql.includes('SELECT menu_id, menu_name, subsystem_id'))
                return { rows: tables.menus }
            if (sql.includes('SELECT option_id')) {
                if (sql.includes('profile_option')) return { rows: tables.profile_option }
                // Basic options select
                return { rows: tables.options }
            }
            if (sql.includes('SELECT menu_id, option_id')) return { rows: tables.menu_option }

            if (sql.includes('SELECT profile_id, subsystem_id'))
                return { rows: tables.profile_subsystem }
            if (sql.includes('SELECT profile_id, menu_id')) return { rows: tables.profile_menu }

            // --- INSERT Queries (RETURNING) ---

            // Subsystem Create
            if (sql.includes('INSERT INTO security.subsystems')) {
                const name = params[0]
                const newRow = { subsystem_id: ++idCounter, subsystem_name: name, menus: [] }
                tables.subsystems.push(newRow)
                return { rows: [newRow] }
            }

            // Menu Create
            if (sql.includes('INSERT INTO security.menus')) {
                const [name, subId] = params
                const newRow = {
                    menu_id: ++idCounter,
                    menu_name: name,
                    subsystem_id: subId,
                    options: [],
                }
                tables.menus.push(newRow)
                return { rows: [newRow] }
            }

            // Option Create
            if (sql.includes('INSERT INTO security.options')) {
                const [name, methodId] = params
                const newRow = { option_id: ++idCounter, option_name: name, method_id: methodId }
                tables.options.push(newRow)
                return { rows: [newRow] }
            }

            // --- ASSIGN Queries (INSERT) ---

            if (sql.includes('INSERT INTO security.profile_subsystem')) {
                tables.profile_subsystem.push({ profile_id: params[0], subsystem_id: params[1] })
                return { rowCount: 1 }
            }
            if (sql.includes('INSERT INTO security.profile_menu')) {
                tables.profile_menu.push({ profile_id: params[0], menu_id: params[1] })
                return { rowCount: 1 }
            }
            if (sql.includes('INSERT INTO security.profile_option')) {
                tables.profile_option.push({ profile_id: params[0], option_id: params[1] })
                return { rowCount: 1 }
            }
            if (sql.includes('INSERT INTO security.menu_option')) {
                tables.menu_option.push({ menu_id: params[0], option_id: params[1] })
                return { rowCount: 1 }
            }

            // --- REVOKE Queries (DELETE) ---

            if (sql.includes('DELETE FROM security.profile_subsystem')) {
                tables.profile_subsystem = tables.profile_subsystem.filter(
                    (r) => !(r.profile_id === params[0] && r.subsystem_id === params[1])
                )
                return { rowCount: 1 }
            }

            // Fallback for other queries (permissions etc)
            if (sql.includes('security.methods')) return { rows: [] }

            return { rows: [] }
        },
    }
}

test('Security Management API: Full Lifecycle', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator', 'email'],
        async () => {
            // Setup Global Mocks
            globalThis.config = { app: { lang: 'en' }, bo: { path: '../../BO/' } }
            globalThis.i18n = { get: () => {}, translate: (k) => k }

            const logs = []
            globalThis.log = {
                info: (msg) => logs.push(msg),
                error: (msg) => logs.push('ERROR: ' + msg),
                warn: () => {},
                debug: () => {}, // SecurityService calls debug
                trace: () => {},
                child: () => globalThis.log,
            }

            // Use our stateful mock DB
            globalThis.db = createMockDB()

            // Setup other deps
            globalThis.audit = { log: async () => {} }
            globalThis.session = { sessionExists: () => false, createSession: async () => {} }
            globalThis.validator = { validate: () => ({ valid: true }) }
            globalThis.email = {
                send: async () => ({ ok: true }),
                sendTemplate: async () => ({ ok: true }),
                maskEmail: (e) => e,
            }
            
            const mockContainer = createMockContainer(globalThis)
            
            // This is an integration test, we must use the real MenuProvider 
            // tied to the mock container (which holds the Mock DB)
            mockContainer.register('menuProvider', new MenuProvider(mockContainer))

            const security = new SecurityService(mockContainer)
            await security.init() // Loads empty structure

            // 1. Create Structure (Subsystem -> Menu -> Option)
            const sub = await security.createSubsystem('Sales')
            assert.ok(sub.subsystem_id, 'Subsystem should have ID')

            const menu = await security.createMenu('Orders', sub.subsystem_id)
            assert.ok(menu.menu_id, 'Menu should have ID')
            assert.equal(menu.subsystem_id, sub.subsystem_id)

            const opt = await security.createOption('Create Order')
            assert.ok(opt.option_id, 'Option should have ID')

            // Link Option to Menu
            await security.assignOptionToMenu(menu.menu_id, opt.option_id)

            // 2. Verify Visibility (Default: Hidden)
            const profileId = 1
            let structure = await security.getMenuStructure(profileId)
            assert.equal(
                structure.length,
                0,
                'Structure should be empty for profile with no assignments'
            )

            // 3. Assign Permissions
            await security.assignSubsystem(profileId, sub.subsystem_id)
            await security.assignMenu(profileId, menu.menu_id)
            await security.assignOptionToProfile(profileId, opt.option_id)

            // 4. Verify Visibility (Visible)
            structure = await security.getMenuStructure(profileId)
            assert.equal(structure.length, 1, 'Structure should have 1 subsystem')
            assert.equal(structure[0].subsystem_name, 'Sales')
            assert.equal(structure[0].menus.length, 1, 'Subsystem should have 1 menu')
            assert.equal(structure[0].menus[0].menu_name, 'Orders')
            assert.equal(structure[0].menus[0].options.length, 1, 'Menu should have 1 option')

            // 5. Revoke Subsystem
            await security.revokeSubsystem(profileId, sub.subsystem_id)
            structure = await security.getMenuStructure(profileId)
            assert.equal(structure.length, 0, 'Structure should be empty after revoking subsystem')
        }
    )
})
