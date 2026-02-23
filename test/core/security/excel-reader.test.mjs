import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { PermissionMatrixReader } from '../../../src/core/security/excel/PermissionMatrixReader.js'
import { SHEET_DEFINITIONS } from '../../../src/types/excel.js'

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Crea un workbook Excel de prueba con las hojas y datos indicados.
 * @param {Record<string, { columns: string[], rows: string[][] }>} sheets
 * @returns {Promise<Buffer>}
 */
async function buildWorkbook(sheets) {
    const wb = new ExcelJS.Workbook()

    for (const [name, config] of Object.entries(sheets)) {
        const sheet = wb.addWorksheet(name)
        sheet.columns = config.columns.map((c) => ({ header: c, key: c }))
        for (const row of config.rows) {
            const obj = {}
            config.columns.forEach((col, i) => {
                obj[col] = row[i] ?? ''
            })
            sheet.addRow(obj)
        }
    }

    return Buffer.from(await wb.xlsx.writeBuffer())
}

/** Validator mock compatible con IValidator. */
function createMockValidator() {
    return {
        validate(data, schema) {
            const result = schema.safeParse(data)
            if (result.success) return { valid: true, data: result.data, errors: [] }
            return {
                valid: false,
                data: null,
                errors: result.error.issues.map((i) => ({
                    path: i.path.join('.') || '',
                    message: i.message,
                    code: i.code,
                })),
            }
        },
    }
}

/** Logger mock que captura mensajes. */
function createMockLogger() {
    const logs = { info: [], warn: [], error: [], debug: [], trace: [] }
    const logger = {
        info: (msg, meta) => logs.info.push({ msg, meta }),
        warn: (msg, meta) => logs.warn.push({ msg, meta }),
        error: (msg, meta) => logs.error.push({ msg, meta }),
        debug: (msg, meta) => logs.debug.push({ msg, meta }),
        trace: (msg, meta) => logs.trace.push({ msg, meta }),
        critical: () => {},
        child: () => logger,
        getLogs: () => logs,
    }
    return logger
}

/**
 * Mock DB con routing por contenido de query.
 * @param {object} opts - Opciones para controlar respuestas.
 */
function createMockDB(opts = {}) {
    const queries = []
    return {
        queries,
        async query(sql, params = []) {
            queries.push({ sql, params })

            // INSERT profile → retorna profile_id
            if (sql.includes('INSERT') && sql.includes('profiles')) {
                return { rows: opts.profileInsertFail ? [] : [{ profile_id: 1 }] }
            }
            // INSERT user
            if (sql.includes('INSERT') && sql.includes('users')) {
                return { rows: [{ user_id: 1 }] }
            }
            // INSERT subsystem
            if (sql.includes('INSERT') && sql.includes('subsystems')) {
                return { rows: [{ subsystem_id: 1 }] }
            }
            // INSERT object
            if (sql.includes('INSERT') && sql.includes('objects') && !sql.includes('object_method')) {
                return { rows: [{ object_id: 1 }] }
            }
            // INSERT method
            if (sql.includes('INSERT') && sql.includes('methods') && !sql.includes('object_method') && !sql.includes('profile_method')) {
                return { rows: [{ method_id: 1 }] }
            }
            // INSERT object_method
            if (sql.includes('INSERT') && sql.includes('object_method')) {
                return { rows: [] }
            }
            // INSERT transaction
            if (sql.includes('INSERT') && sql.includes('transactions')) {
                return { rows: [] }
            }
            // INSERT menu
            if (sql.includes('INSERT') && sql.includes('menus')) {
                return { rows: [{ menu_id: 1 }] }
            }
            // INSERT option
            if (sql.includes('INSERT') && sql.includes('options') && !sql.includes('menu_option')) {
                return { rows: [{ option_id: 1 }] }
            }
            // INSERT menu_option
            if (sql.includes('INSERT') && sql.includes('menu_option')) {
                return { rows: [] }
            }
            // INSERT permission (profile_method)
            if (sql.includes('INSERT') && sql.includes('profile_method')) {
                return { rows: [{ profile_method_id: 1 }] }
            }
            // INSERT profile_subsystem
            if (sql.includes('INSERT') && sql.includes('profile_subsystem')) {
                return { rows: [] }
            }
            // INSERT profile_menu
            if (sql.includes('INSERT') && sql.includes('profile_menu')) {
                return { rows: [] }
            }
            // INSERT profile_option
            if (sql.includes('INSERT') && sql.includes('profile_option')) {
                return { rows: [] }
            }
            // FIND profile by name
            if (sql.includes('profile_id') && sql.includes('profile_name') && sql.includes('WHERE')) {
                return { rows: opts.profileNotFound ? [] : [{ profile_id: 1 }] }
            }
            // FIND subsystem by name
            if (sql.includes('subsystem_id') && sql.includes('WHERE')) {
                return { rows: opts.subsystemNotFound ? [] : [{ subsystem_id: 1 }] }
            }
            // FIND menu by name
            if (sql.includes('menu_id') && sql.includes('WHERE') && !sql.includes('INSERT')) {
                return { rows: [{ menu_id: 1 }] }
            }
            // FIND method by object_method
            if (sql.includes('method_id') && sql.includes('object_name') && sql.includes('method_name') && !sql.includes('INSERT')) {
                return { rows: opts.methodNotFound ? [] : [{ method_id: 1 }] }
            }
            // FIND object by name
            if (sql.includes('object_id') && sql.includes('object_name') && sql.includes('WHERE') && !sql.includes('INSERT')) {
                return { rows: opts.objectNotFound ? [] : [{ object_id: 1 }] }
            }
            // FIND method by name
            if (sql.includes('method_id') && sql.includes('method_name') && sql.includes('WHERE') && !sql.includes('INSERT') && !sql.includes('object_name')) {
                return { rows: [{ method_id: 1 }] }
            }
            // SELECT next_tx
            if (sql.includes('MAX') && sql.includes('transaction_number')) {
                return { rows: [{ next_tx: 100 }] }
            }
            return { rows: [] }
        },
    }
}

// ═══════════════════════════════════════════════════════════════════
// import() — Flujo completo
// ═══════════════════════════════════════════════════════════════════

test('Reader import procesa un Excel mínimo con solo Perfiles', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.PROFILES.name]: {
            columns: ['profile_name'],
            rows: [['Admin'], ['User']],
        },
    })

    const db = createMockDB()
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(result.success)
    const profileSummary = result.summary.find((s) => s.sheet === SHEET_DEFINITIONS.PROFILES.name)
    assert.ok(profileSummary)
    assert.equal(profileSummary.processed, 2)
    assert.equal(profileSummary.inserted, 2)
})

test('Reader import procesa Objetos y Métodos correctamente', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.OBJECTS.name]: {
            columns: ['object_name'],
            rows: [['Auth'], ['Products']],
        },
        [SHEET_DEFINITIONS.METHODS.name]: {
            columns: ['object_name', 'method_name'],
            rows: [['Auth', 'login'], ['Auth', 'logout'], ['Products', 'list']],
        },
    })

    const db = createMockDB()
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(result.success)

    const objectSummary = result.summary.find((s) => s.sheet === SHEET_DEFINITIONS.OBJECTS.name)
    assert.ok(objectSummary)
    assert.equal(objectSummary.inserted, 2)

    const methodSummary = result.summary.find((s) => s.sheet === SHEET_DEFINITIONS.METHODS.name)
    assert.ok(methodSummary)
    assert.equal(methodSummary.inserted, 3)
})

test('Reader import retorna errores para filas inválidas', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.PROFILES.name]: {
            columns: ['profile_name'],
            rows: [['X'.repeat(101)], ['ValidProfile']],
        },
    })

    const db = createMockDB()
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(!result.success)
    assert.ok(result.errors.length > 0)
    assert.equal(result.errors[0].sheet, SHEET_DEFINITIONS.PROFILES.name)
})

test('Reader import salta hojas que no existen en el workbook', async () => {
    const buffer = await buildWorkbook({}) // Workbook vacío

    const db = createMockDB()
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(result.success)
    assert.equal(result.summary.length, 0)
})

test('Reader import ignora filas completamente vacías', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.PROFILES.name]: {
            columns: ['profile_name'],
            rows: [['Admin'], [''], ['User']],
        },
    })

    const db = createMockDB()
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(result.success)
    const summary = result.summary.find((s) => s.sheet === SHEET_DEFINITIONS.PROFILES.name)
    assert.equal(summary.processed, 2) // solo Admin y User
})

// ═══════════════════════════════════════════════════════════════════
// Validación de Objetos
// ═══════════════════════════════════════════════════════════════════

test('Reader rechaza object_name con caracteres inválidos', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.OBJECTS.name]: {
            columns: ['object_name'],
            rows: [['Invalid Object!']],
        },
    })

    const db = createMockDB()
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(!result.success)
    assert.equal(result.errors[0].sheet, 'Objetos')
})

// ═══════════════════════════════════════════════════════════════════
// Validación de Métodos
// ═══════════════════════════════════════════════════════════════════

test('Reader reporta error cuando object no existe para un método', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.METHODS.name]: {
            columns: ['object_name', 'method_name'],
            rows: [['NonExistent', 'method1']],
        },
    })

    const db = createMockDB({ objectNotFound: true })
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(!result.success)
    assert.ok(result.errors.some((e) => e.message.includes('no existe')))
})

// ═══════════════════════════════════════════════════════════════════
// Usuarios — FK validation
// ═══════════════════════════════════════════════════════════════════

test('Reader reporta error cuando perfil no existe para un usuario', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.USERS.name]: {
            columns: ['username', 'password', 'profile_name'],
            rows: [['john', 'secret123', 'FakePerfil']],
        },
    })

    const db = createMockDB({ profileNotFound: true })
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(!result.success)
    assert.ok(result.errors.some((e) => e.message.includes('no existe')))
})

// ═══════════════════════════════════════════════════════════════════
// Menús — FK validation
// ═══════════════════════════════════════════════════════════════════

test('Reader reporta error cuando subsistema no existe para un menú', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.MENUS.name]: {
            columns: ['menu_name', 'subsystem_name'],
            rows: [['Dashboard', 'FakeSub']],
        },
    })

    const db = createMockDB({ subsystemNotFound: true })
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(!result.success)
    assert.ok(result.errors.some((e) => e.message.includes('no existe')))
})

// ═══════════════════════════════════════════════════════════════════
// Opciones — method resolution
// ═══════════════════════════════════════════════════════════════════

test('Reader reporta error cuando object_method no se resuelve', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.OPTIONS.name]: {
            columns: ['option_name', 'object_method', 'menu_name'],
            rows: [['Ver', 'NonExist.method', '']],
        },
    })

    const db = createMockDB({ methodNotFound: true })
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// Logging
// ═══════════════════════════════════════════════════════════════════

test('Reader loguea inicio de importación con trace', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.PROFILES.name]: {
            columns: ['profile_name'],
            rows: [['X']],
        },
    })

    const logger = createMockLogger()
    const reader = new PermissionMatrixReader(createMockDB(), createMockValidator(), logger)
    await reader.import(buffer)

    assert.ok(
        logger.getLogs().trace.some((l) => l.msg.includes('Iniciando importación')),
        'Debe loguear inicio de importación'
    )
})

test('Reader loguea warn cuando hay errores', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.PROFILES.name]: {
            columns: ['profile_name'],
            rows: [['X'.repeat(101)]],
        },
    })

    const logger = createMockLogger()
    const reader = new PermissionMatrixReader(createMockDB(), createMockValidator(), logger)
    const result = await reader.import(buffer)

    assert.ok(!result.success)
    assert.ok(
        logger.getLogs().warn.some((l) => l.msg.includes('errores')),
        'Debe loguear warning cuando hay errores'
    )
})

test('Reader loguea trace exitoso cuando no hay errores', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.PROFILES.name]: {
            columns: ['profile_name'],
            rows: [['Admin']],
        },
    })

    const logger = createMockLogger()
    const reader = new PermissionMatrixReader(createMockDB(), createMockValidator(), logger)
    const result = await reader.import(buffer)

    assert.ok(result.success)
    assert.ok(
        logger.getLogs().trace.some((l) => l.msg.includes('completada sin errores')),
        'Debe loguear completada sin errores'
    )
})

// ═══════════════════════════════════════════════════════════════════
// ExcelQueries — SQL parameterización
// ═══════════════════════════════════════════════════════════════════

test('Reader usa queries parametrizadas (no concatena valores)', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.PROFILES.name]: {
            columns: ['profile_name'],
            rows: [["Robert'; DROP TABLE security.profiles; --"]],
        },
    })

    const db = createMockDB()
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    await reader.import(buffer)

    // Verificar que el valor malicioso se pasó como parámetro, no concatenado
    const insertQuery = db.queries.find((q) => q.sql.includes('INSERT') && q.sql.includes('profiles'))
    assert.ok(insertQuery, 'Debe ejecutar INSERT parametrizado')
    assert.ok(insertQuery.params.length > 0, 'Debe usar parámetros')
    assert.ok(insertQuery.sql.includes('$1'), 'Query debe usar placeholder $1')
    assert.ok(!insertQuery.sql.includes('Robert'), 'El valor no debe estar concatenado en la query')
})

// ═══════════════════════════════════════════════════════════════════
// ImportResult structure
// ═══════════════════════════════════════════════════════════════════

test('ImportResult tiene estructura correcta', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.PROFILES.name]: {
            columns: ['profile_name'],
            rows: [['Admin']],
        },
    })

    const reader = new PermissionMatrixReader(createMockDB(), createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok('success' in result)
    assert.ok('summary' in result)
    assert.ok('errors' in result)
    assert.ok(Array.isArray(result.summary))
    assert.ok(Array.isArray(result.errors))

    const s = result.summary[0]
    assert.ok('sheet' in s)
    assert.ok('processed' in s)
    assert.ok('inserted' in s)
    assert.ok('skipped' in s)
})

// ═══════════════════════════════════════════════════════════════════
// Flujo completo — Todas las hojas
// ═══════════════════════════════════════════════════════════════════

test('Reader procesa todas las 9 hojas en orden correcto', async () => {
    const buffer = await buildWorkbook({
        [SHEET_DEFINITIONS.PROFILES.name]: {
            columns: ['profile_name'],
            rows: [['Admin']],
        },
        [SHEET_DEFINITIONS.USERS.name]: {
            columns: ['username', 'password', 'profile_name'],
            rows: [['admin', 'secret123', 'Admin']],
        },
        [SHEET_DEFINITIONS.SUBSYSTEMS.name]: {
            columns: ['subsystem_name'],
            rows: [['Core']],
        },
        [SHEET_DEFINITIONS.OBJECTS.name]: {
            columns: ['object_name'],
            rows: [['Auth']],
        },
        [SHEET_DEFINITIONS.METHODS.name]: {
            columns: ['object_name', 'method_name'],
            rows: [['Auth', 'login']],
        },
        [SHEET_DEFINITIONS.MENUS.name]: {
            columns: ['menu_name', 'subsystem_name'],
            rows: [['Dashboard', 'Core']],
        },
        [SHEET_DEFINITIONS.OPTIONS.name]: {
            columns: ['option_name', 'object_method', 'menu_name'],
            rows: [['Ver', 'Auth.login', 'Dashboard']],
        },
        [SHEET_DEFINITIONS.PERMISSIONS.name]: {
            columns: ['profile_name', 'object_method'],
            rows: [['Admin', 'Auth.login']],
        },
        [SHEET_DEFINITIONS.ASSIGNMENTS.name]: {
            columns: ['profile_name', 'subsystem_name', 'menu_name', 'option_name'],
            rows: [['Admin', 'Core', 'Dashboard', 'Ver']],
        },
    })

    const db = createMockDB()
    const reader = new PermissionMatrixReader(db, createMockValidator(), createMockLogger())
    const result = await reader.import(buffer)

    assert.ok(result.success, `Expected success but got errors: ${JSON.stringify(result.errors)}`)
    assert.equal(result.summary.length, 9)

    // Verificar orden de procesamiento
    const sheetOrder = result.summary.map((s) => s.sheet)
    const expectedOrder = [
        SHEET_DEFINITIONS.PROFILES.name,
        SHEET_DEFINITIONS.USERS.name,
        SHEET_DEFINITIONS.SUBSYSTEMS.name,
        SHEET_DEFINITIONS.OBJECTS.name,
        SHEET_DEFINITIONS.METHODS.name,
        SHEET_DEFINITIONS.MENUS.name,
        SHEET_DEFINITIONS.OPTIONS.name,
        SHEET_DEFINITIONS.PERMISSIONS.name,
        SHEET_DEFINITIONS.ASSIGNMENTS.name,
    ]
    assert.deepEqual(sheetOrder, expectedOrder)
})
