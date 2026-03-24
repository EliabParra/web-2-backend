import test from 'node:test'
import assert from 'node:assert/strict'
import {
    normalizeDateOnlyInput,
    normalizeDateTimeInput,
    formatCaracasDate,
    formatCaracasDateTime,
} from '../../src/utils/datetime.js'

test('normalizeDateOnlyInput accepts dd/MM/yyyy', () => {
    const normalized = normalizeDateOnlyInput('23/03/2026')
    assert.equal(normalized, '2026-03-23')
})

test('normalizeDateOnlyInput accepts ISO datetime and converts to Caracas date', () => {
    const normalized = normalizeDateOnlyInput('2026-03-24T02:15:00.000Z')
    assert.equal(normalized, '2026-03-23')
})

test('normalizeDateTimeInput accepts dd/MM/yyyy and returns ISO UTC', () => {
    const normalized = normalizeDateTimeInput('23/03/2026')
    assert.equal(normalized, '2026-03-23T04:00:00.000Z')
})

test('formatCaracasDate returns local date format', () => {
    const value = formatCaracasDate('2026-03-23T04:00:00.000Z', 'es-VE')
    assert.equal(value, '23/03/2026')
})

test('formatCaracasDateTime returns local datetime format', () => {
    const value = formatCaracasDateTime('2026-03-23T16:35:00.000Z', 'es-VE')
    assert.ok(value?.includes('23/03/2026'))
    assert.ok(value?.includes('12:35:00'))
})
