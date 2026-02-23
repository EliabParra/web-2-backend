import test from 'node:test'
import assert from 'node:assert/strict'
import {
    ProfileRowSchema,
    UserRowSchema,
    SubsystemRowSchema,
    ObjectRowSchema,
    MethodRowSchema,
    MenuRowSchema,
    OptionRowSchema,
    PermissionRowSchema,
    AssignmentRowSchema,
    ObjectMethodSchema,
    SHEET_DEFINITIONS,
} from '../../../src/types/excel.js'

// ═══════════════════════════════════════════════════════════════════
// ProfileRowSchema
// ═══════════════════════════════════════════════════════════════════

test('ProfileRowSchema acepta nombre válido', () => {
    const result = ProfileRowSchema.safeParse({ profile_name: 'Admin' })
    assert.ok(result.success)
    assert.equal(result.data.profile_name, 'Admin')
})

test('ProfileRowSchema rechaza nombre vacío', () => {
    const result = ProfileRowSchema.safeParse({ profile_name: '' })
    assert.ok(!result.success)
})

test('ProfileRowSchema rechaza nombre mayor a 100 caracteres', () => {
    const result = ProfileRowSchema.safeParse({ profile_name: 'X'.repeat(101) })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// UserRowSchema
// ═══════════════════════════════════════════════════════════════════

test('UserRowSchema acepta datos válidos', () => {
    const result = UserRowSchema.safeParse({
        username: 'john',
        password: 'secret123',
        profile_name: 'Admin',
    })
    assert.ok(result.success)
    assert.equal(result.data.username, 'john')
})

test('UserRowSchema rechaza password vacío', () => {
    const result = UserRowSchema.safeParse({
        username: 'john',
        password: '',
        profile_name: 'Admin',
    })
    assert.ok(!result.success)
})

test('UserRowSchema rechaza username vacío', () => {
    const result = UserRowSchema.safeParse({
        username: '',
        password: 'secret123',
        profile_name: 'Admin',
    })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// SubsystemRowSchema
// ═══════════════════════════════════════════════════════════════════

test('SubsystemRowSchema acepta nombre válido', () => {
    const result = SubsystemRowSchema.safeParse({ subsystem_name: 'Core' })
    assert.ok(result.success)
})

test('SubsystemRowSchema rechaza vacío', () => {
    const result = SubsystemRowSchema.safeParse({ subsystem_name: '' })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// ObjectRowSchema
// ═══════════════════════════════════════════════════════════════════

test('ObjectRowSchema acepta nombre alfanumérico', () => {
    const result = ObjectRowSchema.safeParse({ object_name: 'Auth' })
    assert.ok(result.success)
})

test('ObjectRowSchema acepta guiones bajos', () => {
    const result = ObjectRowSchema.safeParse({ object_name: 'My_Object' })
    assert.ok(result.success)
})

test('ObjectRowSchema rechaza nombre con espacios', () => {
    const result = ObjectRowSchema.safeParse({ object_name: 'My Object' })
    assert.ok(!result.success)
})

test('ObjectRowSchema rechaza nombre que empieza con número', () => {
    const result = ObjectRowSchema.safeParse({ object_name: '1Object' })
    assert.ok(!result.success)
})

test('ObjectRowSchema rechaza nombre con caracteres especiales', () => {
    const result = ObjectRowSchema.safeParse({ object_name: 'Auth-BO' })
    assert.ok(!result.success)
})

test('ObjectRowSchema rechaza vacío', () => {
    const result = ObjectRowSchema.safeParse({ object_name: '' })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// MethodRowSchema
// ═══════════════════════════════════════════════════════════════════

test('MethodRowSchema acepta par objeto-método válido', () => {
    const result = MethodRowSchema.safeParse({ object_name: 'Auth', method_name: 'login' })
    assert.ok(result.success)
})

test('MethodRowSchema rechaza method_name con puntos', () => {
    const result = MethodRowSchema.safeParse({ object_name: 'Auth', method_name: 'do.login' })
    assert.ok(!result.success)
})

test('MethodRowSchema rechaza method_name vacío', () => {
    const result = MethodRowSchema.safeParse({ object_name: 'Auth', method_name: '' })
    assert.ok(!result.success)
})

test('MethodRowSchema rechaza object_name vacío', () => {
    const result = MethodRowSchema.safeParse({ object_name: '', method_name: 'login' })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// MenuRowSchema
// ═══════════════════════════════════════════════════════════════════

test('MenuRowSchema acepta datos válidos', () => {
    const result = MenuRowSchema.safeParse({ menu_name: 'Dashboard', subsystem_name: 'Core' })
    assert.ok(result.success)
})

test('MenuRowSchema rechaza menu_name vacío', () => {
    const result = MenuRowSchema.safeParse({ menu_name: '', subsystem_name: 'Core' })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// OptionRowSchema
// ═══════════════════════════════════════════════════════════════════

test('OptionRowSchema acepta datos con object_method', () => {
    const result = OptionRowSchema.safeParse({
        option_name: 'Ver listado',
        object_method: 'Products.list',
        menu_name: 'Productos',
    })
    assert.ok(result.success)
})

test('OptionRowSchema acepta datos sin object_method (vacío)', () => {
    const result = OptionRowSchema.safeParse({
        option_name: 'Ver listado',
        object_method: '',
        menu_name: '',
    })
    assert.ok(result.success)
})

// ═══════════════════════════════════════════════════════════════════
// PermissionRowSchema
// ═══════════════════════════════════════════════════════════════════

test('PermissionRowSchema acepta datos válidos', () => {
    const result = PermissionRowSchema.safeParse({
        profile_name: 'Admin',
        object_method: 'Auth.login',
    })
    assert.ok(result.success)
})

test('PermissionRowSchema rechaza object_method sin punto', () => {
    const result = PermissionRowSchema.safeParse({
        profile_name: 'Admin',
        object_method: 'AuthLogin',
    })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// AssignmentRowSchema
// ═══════════════════════════════════════════════════════════════════

test('AssignmentRowSchema acepta datos completos', () => {
    const result = AssignmentRowSchema.safeParse({
        profile_name: 'Admin',
        subsystem_name: 'Core',
        menu_name: 'Dashboard',
        option_name: 'Ver',
    })
    assert.ok(result.success)
})

test('AssignmentRowSchema aplica default vacío a menu_name y option_name', () => {
    const result = AssignmentRowSchema.safeParse({
        profile_name: 'Admin',
        subsystem_name: 'Core',
    })
    assert.ok(result.success)
    assert.equal(result.data.menu_name, '')
    assert.equal(result.data.option_name, '')
})

// ═══════════════════════════════════════════════════════════════════
// ObjectMethodSchema (regex)
// ═══════════════════════════════════════════════════════════════════

test('ObjectMethodSchema acepta formato Objeto.metodo', () => {
    const result = ObjectMethodSchema.safeParse('Auth.login')
    assert.ok(result.success)
})

test('ObjectMethodSchema acepta guiones bajos', () => {
    const result = ObjectMethodSchema.safeParse('My_BO.get_all')
    assert.ok(result.success)
})

test('ObjectMethodSchema rechaza sin punto', () => {
    const result = ObjectMethodSchema.safeParse('AuthLogin')
    assert.ok(!result.success)
})

test('ObjectMethodSchema rechaza vacío', () => {
    const result = ObjectMethodSchema.safeParse('')
    assert.ok(!result.success)
})

test('ObjectMethodSchema rechaza solo punto', () => {
    const result = ObjectMethodSchema.safeParse('.')
    assert.ok(!result.success)
})

test('ObjectMethodSchema rechaza doble punto', () => {
    const result = ObjectMethodSchema.safeParse('Auth..login')
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// SHEET_DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

test('SHEET_DEFINITIONS contiene 9 hojas', () => {
    const keys = Object.keys(SHEET_DEFINITIONS)
    assert.equal(keys.length, 9)
})

test('SHEET_DEFINITIONS incluye OBJECTS y METHODS', () => {
    assert.ok(SHEET_DEFINITIONS.OBJECTS)
    assert.ok(SHEET_DEFINITIONS.METHODS)
    assert.equal(SHEET_DEFINITIONS.OBJECTS.name, 'Objetos')
    assert.equal(SHEET_DEFINITIONS.METHODS.name, 'Métodos')
    assert.deepEqual([...SHEET_DEFINITIONS.OBJECTS.columns], ['object_name'])
    assert.deepEqual([...SHEET_DEFINITIONS.METHODS.columns], ['object_name', 'method_name'])
})

test('SHEET_DEFINITIONS mantiene orden de dependencias', () => {
    const keys = Object.keys(SHEET_DEFINITIONS)
    const objectsIdx = keys.indexOf('OBJECTS')
    const methodsIdx = keys.indexOf('METHODS')
    const menusIdx = keys.indexOf('MENUS')
    const permissionsIdx = keys.indexOf('PERMISSIONS')

    assert.ok(objectsIdx < methodsIdx, 'OBJECTS antes de METHODS')
    assert.ok(methodsIdx < menusIdx, 'METHODS antes de MENUS')
    assert.ok(menusIdx < permissionsIdx, 'MENUS antes de PERMISSIONS')
})
