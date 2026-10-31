import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ComponentSchemas } from '../../BO/Component/ComponentSchemas.js'
import { EquipmentSchemas } from '../../BO/Equipment/EquipmentSchemas.js'

for (const [name, schemas] of [
    ['Component', ComponentSchemas],
    ['Equipment', EquipmentSchemas],
] as const) {
    describe(`${name} item code`, () => {
        it('accepts alphanumeric codes and trims them', () => {
            const parsed = schemas.create.parse({ item_cod: ' R-100 ', item_na: 'Resistencia', category_id: 1 })
            assert.equal(parsed.item_cod, 'R-100')
            assert.equal(schemas.update.parse({ item_id: 1, item_cod: 'LM317T' }).item_cod, 'LM317T')
        })

        it('rejects empty and overly long codes', () => {
            assert.equal(schemas.create.safeParse({ item_cod: '  ', item_na: 'x', category_id: 1 }).success, false)
            assert.equal(schemas.create.safeParse({ item_cod: 'X'.repeat(51), item_na: 'x', category_id: 1 }).success, false)
        })
    })
}
