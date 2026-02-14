/**
 * Comprehensive Auth and Security Tests
 * Tests all AuthBO methods and SecurityService permission management
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { withGlobals } from '../_helpers/global-state.mjs'
import { createMockContainer } from '../_helpers/mock-container.mjs'
import { SecurityService } from '../../src/services/SecurityService.js'

// ============================================================================
// MOCK FACTORIES
// ============================================================================

const mockLocaleData = {
    errors: {
        server: { serverError: { code: 500, msg: 'Server error' } },
        auth: {
            userNotFound: { code: 404, msg: 'User not found' },
            invalidCredentials: { code: 401, msg: 'Invalid credentials' },
            tokenExpired: { code: 401, msg: 'Token expired' },
        },
    },
    success: {
        auth: {
            registerSuccess: { code: 201, msg: 'Registration successful' },
            emailVerified: { code: 200, msg: 'Email verified' },
            passwordChanged: { code: 200, msg: 'Password changed' },
        },
    },
}

function createMockI18n() {
    return {
        translate: (key) => key,
        format: (msg, params) => msg,
        error: (key) => mockLocaleData.errors.server.serverError,
        get: (key) => mockLocaleData,
        get messages() {
            return mockLocaleData
        },
        use: () => mockLocaleData.success.auth,
    }
}

function createMockLogger() {
    const logs = []
    const logger = {
        logs,
        info: (msg) => logs.push({ level: 'info', msg }),
        error: (msg) => logs.push({ level: 'error', msg }),
        warn: (msg) => logs.push({ level: 'warn', msg }),
        debug: () => {},
        trace: () => {},
        critical: () => {},
        child: () => logger,
    }
    return logger
}

function createMockDb(overrides = {}) {
    const queryResults = {
        profile_method: {
            rows: [
                { profile_id: 1, object_name: 'Auth', method_name: 'register' },
                { profile_id: 1, object_name: 'Auth', method_name: 'verifyEmail' },
                { profile_id: 1, object_name: 'Auth', method_name: 'requestPasswordReset' },
                { profile_id: 2, object_name: 'Auth', method_name: 'register' }, // Different profile
            ],
        },
        transactions: {
            rows: [
                { tx: 1, object_name: 'Auth', method_name: 'register' },
                { tx: 2, object_name: 'Auth', method_name: 'verifyEmail' },
                { tx: 3, object_name: 'Auth', method_name: 'requestPasswordReset' },
            ],
        },
        'security.methods': {
            rows: [
                { tx: 1, object_name: 'Auth', method_name: 'register' },
                { tx: 2, object_name: 'Auth', method_name: 'verifyEmail' },
            ],
        },
        ...overrides,
    }

    return {
        query: async (sql) => {
            // Handle INSERT/DELETE/UPDATE specifically
            if (sql.includes('INSERT') || sql.includes('DELETE') || sql.includes('UPDATE')) {
                return { rows: [], rowCount: 0 }
            }

            for (const [key, result] of Object.entries(queryResults)) {
                if (sql.includes(key)) {
                    return result
                }
            }
            return { rows: [] }
        },
        exeRaw: async (sql, params) => {
            // ...
            // Grant permission - simulate INSERT success
            if (sql.includes('INSERT INTO security.profile_method')) {
                return { rows: [{ profile_method_id: 99 }], rowCount: 1 }
            }
            // Revoke permission - simulate DELETE success
            if (sql.includes('DELETE FROM security.profile_method')) {
                return { rowCount: 1 }
            }
            return { rows: [], rowCount: 0 }
        },
    }
}

function createMockDeps(overrides = {}) {
    return {
        config: { app: { lang: 'en' }, bo: { path: '../../BO/' } },
        i18n: createMockI18n(),
        log: createMockLogger(),
        db: createMockDb(overrides.dbOverrides || {}),
        audit: { log: async () => {} },
        session: {
            sessionExists: () => false,
            createSession: async () => {},
            destroySession: () => {},
        },
        validator: { validate: () => ({ valid: true, data: {} }) },
        email: { send: async () => ({ success: true }) },
        ...overrides,
    }
}

// ============================================================================
// SECURITY SERVICE - PERMISSION TESTS
// ============================================================================

test('SecurityService: getPermissions returns true for authorized profile', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            Object.assign(globalThis, createMockDeps())

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            const result = security.getPermissions({
                profileId: 1,
                objectName: 'Auth',
                methodName: 'register',
            })

            assert.equal(result, true, 'Profile 1 should have permission for Auth.register')
        }
    )
})

test('SecurityService: getPermissions returns false for unauthorized profile', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            Object.assign(globalThis, createMockDeps())

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            const result = security.getPermissions({
                profileId: 999, // Non-existent profile
                objectName: 'Auth',
                methodName: 'register',
            })

            assert.equal(result, false, 'Non-existent profile should not have permission')
        }
    )
})

test('SecurityService: getPermissions returns false for unauthorized method', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            Object.assign(globalThis, createMockDeps())

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            const result = security.getPermissions({
                profileId: 1,
                objectName: 'Auth',
                methodName: 'nonExistentMethod', // Method not in permissions
            })

            assert.equal(
                result,
                false,
                'Profile should not have permission for non-existent method'
            )
        }
    )
})

test('SecurityService: getDataTx resolves valid transaction code', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            Object.assign(globalThis, createMockDeps())

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            const route = security.getDataTx(1)

            assert.deepEqual(route, { objectName: 'Auth', methodName: 'register' })
        }
    )
})

test('SecurityService: getDataTx returns false for invalid transaction code', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            Object.assign(globalThis, createMockDeps())

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            const route = security.getDataTx(9999) // Non-existent TX

            assert.equal(route, false)
        }
    )
})

// ============================================================================
// DYNAMIC PERMISSION MANAGEMENT (DUAL WRITE)
// ============================================================================

test('SecurityService: grantPermission adds permission to profile', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            const deps = createMockDeps()
            // Mock DB insert success for grant
            deps.db.query = async (sql) => {
                // If it's the grant query (INSERT)
                if (sql.includes('INSERT INTO security.profile_method')) {
                    return { rows: [{ profile_method_id: 1 }], rowCount: 1 }
                }
                // Determine which query is being run to return correct data for loads
                // Re-use logic from createMockDb's query if possible, or just mock what's needed
                // But we replaced the WHOLE query method, so we lose default behavior!
                // We should wrap the default query behavior.

                // Let's use the default createMockDb but override query logic carefully.
                // The default createMockDb.query handles SELECTs. We need that for init().

                // Better approach: modifying the existing mock instance
                return createMockDb().query(sql)
            }
            Object.assign(globalThis, deps)

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            // Initially profile 3 has no permissions
            const beforeGrant = security.getPermissions({
                profileId: 3,
                objectName: 'Auth',
                methodName: 'verifyEmail',
            })
            assert.equal(beforeGrant, false, 'Profile 3 should not have permission before grant')

            // Grant the permission
            const granted = await security.grantPermission(3, 'Auth', 'verifyEmail')
            assert.equal(granted, true, 'grantPermission should return true on success')

            // Now profile 3 should have permission (in memory cache)
            const afterGrant = security.getPermissions({
                profileId: 3,
                objectName: 'Auth',
                methodName: 'verifyEmail',
            })
            assert.equal(afterGrant, true, 'Profile 3 should have permission after grant')
        }
    )
})

test('SecurityService: revokePermission removes permission from profile', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            const deps = createMockDeps()
            // Mock DB delete success for revoke
            deps.db.query = async (sql) => {
                if (sql.includes('DELETE FROM security.profile_method')) {
                    return { rowCount: 1 }
                }
                return createMockDb().query(sql)
            }
            Object.assign(globalThis, deps)

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            // Profile 1 has permission for Auth.register initially
            const beforeRevoke = security.getPermissions({
                profileId: 1,
                objectName: 'Auth',
                methodName: 'register',
            })
            assert.equal(beforeRevoke, true, 'Profile 1 should have permission before revoke')

            // Revoke the permission
            const revoked = await security.revokePermission(1, 'Auth', 'register')
            assert.equal(revoked, true, 'revokePermission should return true on success')

            // Now profile 1 should NOT have permission (removed from memory cache)
            const afterRevoke = security.getPermissions({
                profileId: 1,
                objectName: 'Auth',
                methodName: 'register',
            })
            assert.equal(afterRevoke, false, 'Profile 1 should not have permission after revoke')
        }
    )
})

test('SecurityService: multiple profiles can have same permission', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            const deps = createMockDeps()
            // Mock DB delete success for revoke
            deps.db.query = async (sql) => {
                if (sql.includes('DELETE FROM security.profile_method')) {
                    return { rowCount: 1 }
                }
                return createMockDb().query(sql)
            }
            Object.assign(globalThis, deps)

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            // Both profile 1 and 2 have Auth.register permission
            const profile1 = security.getPermissions({
                profileId: 1,
                objectName: 'Auth',
                methodName: 'register',
            })
            const profile2 = security.getPermissions({
                profileId: 2,
                objectName: 'Auth',
                methodName: 'register',
            })

            assert.equal(profile1, true, 'Profile 1 should have Auth.register')
            assert.equal(profile2, true, 'Profile 2 should have Auth.register')

            // Revoke from profile 1 should not affect profile 2
            await security.revokePermission(1, 'Auth', 'register')

            const profile1After = security.getPermissions({
                profileId: 1,
                objectName: 'Auth',
                methodName: 'register',
            })
            const profile2After = security.getPermissions({
                profileId: 2,
                objectName: 'Auth',
                methodName: 'register',
            })

            assert.equal(profile1After, false, 'Profile 1 should not have permission after revoke')
            assert.equal(profile2After, true, 'Profile 2 should still have permission')
        }
    )
})

// ============================================================================
// EXECUTE METHOD TESTS
// ============================================================================

test('SecurityService: executeMethod returns result for valid BO method', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            Object.assign(globalThis, createMockDeps())

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            // Execute Auth.register (should work since AuthBO exists)
            const result = await security.executeMethod({
                objectName: 'Auth',
                methodName: 'register',
                params: { email: 'test@test.com', password: '12345678', username: 'test' },
            })

            // Should return some response (the actual result depends on AuthService implementation)
            assert.ok(result, 'Should return a result')
            assert.ok('code' in result, 'Result should have a code')
            assert.ok('msg' in result, 'Result should have a message')
        }
    )
})

test('SecurityService: executeMethod returns serverError for non-existent BO', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            Object.assign(globalThis, createMockDeps())

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            const result = await security.executeMethod({
                objectName: 'NonExistentBO',
                methodName: 'someMethod',
                params: {},
            })

            assert.deepEqual(result, mockLocaleData.errors.server.serverError)
        }
    )
})

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

test('SecurityService: isReady is false before init', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            Object.assign(globalThis, createMockDeps())

            const security = new SecurityService(createMockContainer(globalThis))

            assert.equal(security.isReady, false, 'isReady should be false before init')
        }
    )
})

test('SecurityService: isReady is true after successful init', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            Object.assign(globalThis, createMockDeps())

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            assert.equal(security.isReady, true, 'isReady should be true after init')
        }
    )
})

test('SecurityService: init throws and logs on DB failure', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            const deps = createMockDeps()
            deps.db = {
                query: async () => {
                    throw new Error('DB Connection Failed')
                },
            }
            Object.assign(globalThis, deps)

            const security = new SecurityService(createMockContainer(globalThis))

            let error
            try {
                await security.init()
            } catch (e) {
                error = e
            }

            assert.ok(error, 'Should throw error on DB failure')
            assert.equal(security.isReady, false, 'isReady should remain false on failure')
        }
    )
})

// ============================================================================
// EDGE CASES
// ============================================================================

test('SecurityService: handles empty permissions gracefully', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            const deps = createMockDeps({
                dbOverrides: { profile_method: { rows: [] } },
            })
            Object.assign(globalThis, deps)

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            const result = security.getPermissions({
                profileId: 1,
                objectName: 'Auth',
                methodName: 'register',
            })

            assert.equal(result, false, 'Should return false when no permissions loaded')
        }
    )
})

test('SecurityService: handles empty transactions gracefully', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            const deps = createMockDeps({
                dbOverrides: { 'security.methods': { rows: [] }, transactions: { rows: [] } },
            })
            Object.assign(globalThis, deps)

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            const route = security.getDataTx(1)

            assert.equal(route, false, 'Should return false when no transactions loaded')
        }
    )
})

test('SecurityService: grant permission for non-existent method returns false', async () => {
    await withGlobals(
        ['config', 'i18n', 'log', 'db', 'audit', 'session', 'validator'],
        async () => {
            const deps = createMockDeps()
            // Mock DB to return no rows on INSERT (method not found)
            deps.db.exeRaw = async (sql) => {
                if (sql.includes('INSERT INTO security.profile_method')) {
                    return { rows: [], rowCount: 0 }
                }
                return { rows: [], rowCount: 0 }
            }
            Object.assign(globalThis, deps)

            const security = new SecurityService(createMockContainer(globalThis))
            await security.init()

            const result = await security.grantPermission(1, 'NonExistent', 'method')

            assert.equal(result, false, 'Should return false for non-existent object/method')
        }
    )
})
