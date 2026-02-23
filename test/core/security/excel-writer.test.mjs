import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { PermissionMatrixWriter } from '../../../src/core/security/excel/PermissionMatrixWriter.js'
import { SHEET_DEFINITIONS } from '../../../src/types/excel.js'

/**
 * Crea un mock de IDatabase para el Writer.
 * Retorna filas según la query ejecutada.
 */
function createMockDB(data = {}) {
    return {
        async query(sql) {
            if (sql.includes('profile_name') && sql.includes('profiles'))
                return { rows: data.profiles ?? [{ profile_name: 'Admin' }] }
            if (sql.includes('subsystem_name') && sql.includes('subsystems') && !sql.includes('menu'))
                return { rows: data.subsystems ?? [{ subsystem_name: 'Core' }] }
            if (sql.includes('object_name') && sql.includes('objects') && !sql.includes('object_method'))
                return { rows: data.objects ?? [{ object_name: 'Auth' }] }
            if (sql.includes('object_name') && sql.includes('method_name'))
                return { rows: data.methods ?? [{ object_name: 'Auth', method_name: 'login' }] }
            if (sql.includes('menu_name') && sql.includes('subsystem_name'))
                return { rows: data.menus ?? [{ menu_name: 'Dashboard', subsystem_name: 'Core' }] }
            if (sql.includes('menu_name') && !sql.includes('subsystem'))
                return { rows: data.menuNames ?? [{ menu_name: 'Dashboard' }] }
            if (sql.includes('option_name'))
                return { rows: data.options ?? [{ option_name: 'Ver', object_method: 'Auth.login', menu_name: 'Dashboard' }] }
            if (sql.includes('object_method') && !sql.includes('option'))
                return { rows: data.objectMethods ?? [{ object_method: 'Auth.login' }] }
            if (sql.includes('profile_method') && sql.includes('profile_name'))
                return { rows: data.permissions ?? [{ profile_name: 'Admin', object_method: 'Auth.login' }] }
            if (sql.includes('username'))
                return { rows: data.users ?? [{ username: 'admin', password: 'hashed', profile_name: 'Admin' }] }
            if (sql.includes('profile_name') && sql.includes('subsystem_name') && sql.includes('menu_name'))
                return { rows: data.assignments ?? [{ profile_name: 'Admin', subsystem_name: 'Core', menu_name: 'Dashboard', option_name: 'Ver' }] }
            return { rows: [] }
        },
    }
}

/** Lee un workbook desde un buffer. */
async function readWorkbook(buffer) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(Buffer.from(buffer))
    return wb
}

// ═══════════════════════════════════════════════════════════════════
// generateTemplate
// ═══════════════════════════════════════════════════════════════════

test('generateTemplate retorna un buffer válido de Excel', async () => {
    const writer = new PermissionMatrixWriter(createMockDB())
    const buffer = await writer.generateTemplate()

    assert.ok(Buffer.isBuffer(buffer))
    assert.ok(buffer.length > 0)
})

test('generateTemplate crea las 9 hojas de datos + Instrucciones', async () => {
    const writer = new PermissionMatrixWriter(createMockDB())
    const buffer = await writer.generateTemplate()
    const wb = await readWorkbook(buffer)

    const sheetNames = wb.worksheets.map((s) => s.name)

    assert.ok(sheetNames.includes('Instrucciones'), 'Debe incluir Instrucciones')
    for (const def of Object.values(SHEET_DEFINITIONS)) {
        assert.ok(sheetNames.includes(def.name), `Debe incluir hoja "${def.name}"`)
    }
})

test('generateTemplate incluye hoja Objetos con columna correcta', async () => {
    const writer = new PermissionMatrixWriter(createMockDB())
    const buffer = await writer.generateTemplate()
    const wb = await readWorkbook(buffer)

    const sheet = wb.getWorksheet('Objetos')
    assert.ok(sheet, 'Hoja Objetos debe existir')

    const header = sheet.getRow(1)
    assert.equal(header.getCell(1).value, 'object_name')
})

test('generateTemplate incluye hoja Métodos con columnas correctas', async () => {
    const writer = new PermissionMatrixWriter(createMockDB())
    const buffer = await writer.generateTemplate()
    const wb = await readWorkbook(buffer)

    const sheet = wb.getWorksheet('Métodos')
    assert.ok(sheet, 'Hoja Métodos debe existir')

    const header = sheet.getRow(1)
    assert.equal(header.getCell(1).value, 'object_name')
    assert.equal(header.getCell(2).value, 'method_name')
})

test('generateTemplate aplica estilos de header', async () => {
    const writer = new PermissionMatrixWriter(createMockDB())
    const buffer = await writer.generateTemplate()
    const wb = await readWorkbook(buffer)

    const sheet = wb.getWorksheet('Perfiles')
    const headerCell = sheet.getRow(1).getCell(1)

    assert.ok(headerCell.font.bold, 'Header debe ser bold')
    assert.ok(headerCell.fill, 'Header debe tener fill')
})

// ═══════════════════════════════════════════════════════════════════
// exportData
// ═══════════════════════════════════════════════════════════════════

test('exportData incluye datos de la DB en las hojas', async () => {
    const writer = new PermissionMatrixWriter(createMockDB({
        profiles: [{ profile_name: 'Admin' }, { profile_name: 'User' }],
        objects: [{ object_name: 'Auth' }, { object_name: 'Products' }],
    }))

    const buffer = await writer.exportData()
    const wb = await readWorkbook(buffer)

    const profileSheet = wb.getWorksheet('Perfiles')
    // Verificar que los datos están en fila 2 y 3
    assert.equal(profileSheet.getRow(2).getCell(1).value, 'Admin')
    assert.equal(profileSheet.getRow(3).getCell(1).value, 'User')

    const objectSheet = wb.getWorksheet('Objetos')
    assert.equal(objectSheet.getRow(2).getCell(1).value, 'Auth')
    assert.equal(objectSheet.getRow(3).getCell(1).value, 'Products')
})

test('exportData incluye datos de Métodos', async () => {
    const writer = new PermissionMatrixWriter(createMockDB({
        methods: [
            { object_name: 'Auth', method_name: 'login' },
            { object_name: 'Auth', method_name: 'logout' },
        ],
    }))

    const buffer = await writer.exportData()
    const wb = await readWorkbook(buffer)

    const methodSheet = wb.getWorksheet('Métodos')
    assert.equal(methodSheet.getRow(2).getCell(1).value, 'Auth')
    assert.equal(methodSheet.getRow(2).getCell(2).value, 'login')
    assert.equal(methodSheet.getRow(3).getCell(1).value, 'Auth')
    assert.equal(methodSheet.getRow(3).getCell(2).value, 'logout')
})

test('exportData con DB vacía genera hojas con solo headers', async () => {
    const writer = new PermissionMatrixWriter(createMockDB({
        profiles: [],
        users: [],
        subsystems: [],
        objects: [],
        methods: [],
        menus: [],
        options: [],
        objectMethods: [],
        permissions: [],
        assignments: [],
        menuNames: [],
    }))

    const buffer = await writer.exportData()
    const wb = await readWorkbook(buffer)

    const profileSheet = wb.getWorksheet('Perfiles')
    assert.equal(profileSheet.rowCount, 1) // solo header
})
