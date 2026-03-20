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
    const result = ProfileRowSchema.safeParse({ profile_na: 'Admin' })
    assert.ok(result.success)
    assert.equal(result.data.profile_na, 'Admin')
})

test('ProfileRowSchema rechaza nombre vacío', () => {
    const result = ProfileRowSchema.safeParse({ profile_na: '' })
    assert.ok(!result.success)
})

test('ProfileRowSchema rechaza nombre mayor a 100 caracteres', () => {
    const result = ProfileRowSchema.safeParse({ profile_na: 'X'.repeat(101) })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// UserRowSchema
// ═══════════════════════════════════════════════════════════════════

test('UserRowSchema acepta datos válidos', () => {
    const result = UserRowSchema.safeParse({
        user_na: 'john',
        user_pw: 'secret123',
        profile_na: 'Admin',
    })
    assert.ok(result.success)
    assert.equal(result.data.user_na, 'john')
})

test('UserRowSchema rechaza password vacío', () => {
    const result = UserRowSchema.safeParse({
        user_na: 'john',
        user_pw: '',
        profile_na: 'Admin',
    })
    assert.ok(!result.success)
})

test('UserRowSchema rechaza user_na vacío', () => {
    const result = UserRowSchema.safeParse({
        user_na: '',
        user_pw: 'secret123',
        profile_na: 'Admin',
    })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// SubsystemRowSchema
// ═══════════════════════════════════════════════════════════════════

test('SubsystemRowSchema acepta nombre válido', () => {
    const result = SubsystemRowSchema.safeParse({ subsystem_na: 'Core' })
    assert.ok(result.success)
})

test('SubsystemRowSchema rechaza vacío', () => {
    const result = SubsystemRowSchema.safeParse({ subsystem_na: '' })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// ObjectRowSchema
// ═══════════════════════════════════════════════════════════════════

test('ObjectRowSchema acepta nombre alfanumérico', () => {
    const result = ObjectRowSchema.safeParse({ object_na: 'Auth' })
    assert.ok(result.success)
})

test('ObjectRowSchema acepta guiones bajos', () => {
    const result = ObjectRowSchema.safeParse({ object_na: 'My_Object' })
    assert.ok(result.success)
})

test('ObjectRowSchema rechaza nombre con espacios', () => {
    const result = ObjectRowSchema.safeParse({ object_na: 'My Object' })
    assert.ok(!result.success)
})

test('ObjectRowSchema rechaza nombre que empieza con número', () => {
    const result = ObjectRowSchema.safeParse({ object_na: '1Object' })
    assert.ok(!result.success)
})

test('ObjectRowSchema rechaza nombre con caracteres especiales', () => {
    const result = ObjectRowSchema.safeParse({ object_na: 'Auth-BO' })
    assert.ok(!result.success)
})

test('ObjectRowSchema rechaza vacío', () => {
    const result = ObjectRowSchema.safeParse({ object_na: '' })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// MethodRowSchema
// ═══════════════════════════════════════════════════════════════════

test('MethodRowSchema acepta par objeto-método válido', () => {
    const result = MethodRowSchema.safeParse({ object_na: 'Auth', method_na: 'login' })
    assert.ok(result.success)
})

test('MethodRowSchema rechaza method_na con puntos', () => {
    const result = MethodRowSchema.safeParse({ object_na: 'Auth', method_na: 'do.login' })
    assert.ok(!result.success)
})

test('MethodRowSchema rechaza method_na vacío', () => {
    const result = MethodRowSchema.safeParse({ object_na: 'Auth', method_na: '' })
    assert.ok(!result.success)
})

test('MethodRowSchema rechaza object_na vacío', () => {
    const result = MethodRowSchema.safeParse({ object_na: '', method_na: 'login' })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// MenuRowSchema
// ═══════════════════════════════════════════════════════════════════

test('MenuRowSchema acepta datos válidos', () => {
    const result = MenuRowSchema.safeParse({ menu_na: 'Dashboard', subsystem_na: 'Core' })
    assert.ok(result.success)
})

test('MenuRowSchema rechaza menu_na vacío', () => {
    const result = MenuRowSchema.safeParse({ menu_na: '', subsystem_na: 'Core' })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// OptionRowSchema
// ═══════════════════════════════════════════════════════════════════

test('OptionRowSchema acepta datos con object_method', () => {
    const result = OptionRowSchema.safeParse({
        option_na: 'Ver listado',
        object_method: 'Products.list',
        menu_na: 'Productos',
    })
    assert.ok(result.success)
})

test('OptionRowSchema acepta datos sin object_method (vacío)', () => {
    const result = OptionRowSchema.safeParse({
        option_na: 'Ver listado',
        object_method: '',
        menu_na: '',
    })
    assert.ok(result.success)
})

// ═══════════════════════════════════════════════════════════════════
// PermissionRowSchema
// ═══════════════════════════════════════════════════════════════════

test('PermissionRowSchema acepta datos válidos', () => {
    const result = PermissionRowSchema.safeParse({
        profile_na: 'Admin',
        object_method: 'Auth.login',
    })
    assert.ok(result.success)
})

test('PermissionRowSchema rechaza object_method sin punto', () => {
    const result = PermissionRowSchema.safeParse({
        profile_na: 'Admin',
        object_method: 'AuthLogin',
    })
    assert.ok(!result.success)
})

// ═══════════════════════════════════════════════════════════════════
// AssignmentRowSchema
// ═══════════════════════════════════════════════════════════════════

test('AssignmentRowSchema acepta datos completos', () => {
    const result = AssignmentRowSchema.safeParse({
        profile_na: 'Admin',
        subsystem_na: 'Core',
        menu_na: 'Dashboard',
        option_na: 'Ver',
    })
    assert.ok(result.success)
})

test('AssignmentRowSchema aplica default vacío a menu_na y option_na', () => {
    const result = AssignmentRowSchema.safeParse({
        profile_na: 'Admin',
        subsystem_na: 'Core',
    })
    assert.ok(result.success)
    assert.equal(result.data.menu_na, '')
    assert.equal(result.data.option_na, '')
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
    assert.deepEqual([...SHEET_DEFINITIONS.OBJECTS.columns], ['object_na'])
    assert.deepEqual([...SHEET_DEFINITIONS.METHODS.columns], ['object_na', 'method_na'])
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
