import test from 'node:test'
import assert from 'node:assert/strict'
import {
    extractMethodsFromBoSource,
    extractSchemaFieldsFromSource,
} from '../../scripts/explorer/generate.ts'

test('extractMethodsFromBoSource detects async BO methods and schema key from exec', () => {
    const source = `
        import { BaseBO } from '@toproc/bo'
        import { LoanSchemas, Inputs } from './LoanModule.js'

        export class LoanBO extends BaseBO {
            async getAllLoans(
                params: Inputs.GetAllLoansInput
            ): Promise<unknown> {
                return this.exec(params, LoanSchemas.getAllLoans, async (data) => data)
            }

            async getLoan(payload: Inputs.GetLoanInput): Promise<unknown> {
                return this.exec(payload, LoanSchemas.getLoan, async (data) => data)
            }
        }
    `

    const methods = extractMethodsFromBoSource(source)
    const names = methods.map((m) => `${m.className}.${m.methodName}:${m.schemaKey}`)

    assert.deepEqual(names, ['LoanBO.getAllLoans:getAllLoans', 'LoanBO.getLoan:getLoan'])
})

test('extractSchemaFieldsFromSource reads z.object fields even with transformed identifiers', () => {
    const source = `
        import { z } from 'zod'
        export const LoanSchemas = {
            getAllLoans: z.object({
                user_id: z.coerce.number().int().optional(),
                from_dt: dateTimeInput.optional(),
                details: z.array(z.object({ inventory_id: z.coerce.number().int() }))
            })
        }
    `

    const fields = extractSchemaFieldsFromSource(source, 'getAllLoans')

    assert.equal(fields.user_id.type, 'number')
    assert.equal(fields.user_id.optional, true)
    assert.equal(fields.from_dt.type, 'string')
    assert.equal(fields.from_dt.optional, true)
    assert.equal(fields.from_dt.format, 'datetime')
    assert.equal(fields.details.type, 'array')
})

test('extractSchemaFieldsFromSource handles wrapped zod expressions and optional chaining', () => {
    const source = `
        import { z } from 'zod'
        const customDate = z.string().refine(Boolean)

        export const LoanSchemas = {
            create: z.object({
                amount: z.coerce.number().int().min(1).default(1),
                enabled: z.boolean().optional().default(true),
                from_dt: customDate.optional(),
                meta: z.object({ tags: z.array(z.string()) }).nullable(),
                status: z.enum(['A', 'I']).nullish(),
                code: z.literal(99)
            }).strict()
        }
    `

    const fields = extractSchemaFieldsFromSource(source, 'create')

    assert.equal(fields.amount.type, 'number')
    assert.equal(fields.amount.optional, false)

    assert.equal(fields.enabled.type, 'boolean')
    assert.equal(fields.enabled.optional, true)

    assert.equal(fields.from_dt.type, 'string')
    assert.equal(fields.from_dt.optional, true)

    assert.equal(fields.meta.type, 'object')
    assert.equal(fields.meta.optional, false)

    assert.equal(fields.status.type, 'string')
    assert.equal(fields.status.optional, true)
    assert.deepEqual(fields.status.enumValues, ['A', 'I'])

    assert.equal(fields.code.type, 'number')
    assert.equal(fields.code.optional, false)
    assert.deepEqual(fields.code.enumValues, [99])
})

test('extractSchemaFieldsFromSource builds lookup metadata from describe and inferred method map', () => {
    const source = `
        import { z } from 'zod'
        export const LoanSchemas = {
            create: z.object({
                user_id: z.coerce.number().describe('lookup=UserBO.getAll;value=user_id;label=user_na'),
                category: z.string()
            })
        }
    `

    const methods = [
        {
            className: 'UserBO',
            methodName: 'getAll',
            schemaKey: 'getAll',
            tx: 120,
            boFile: 'BO/User/UserBO.ts',
            schemaContent: '',
        },
        {
            className: 'CategoryBO',
            methodName: 'list',
            schemaKey: 'list',
            tx: 121,
            boFile: 'BO/Category/CategoryBO.ts',
            schemaContent: '',
        },
    ]

    const fields = extractSchemaFieldsFromSource(source, 'create', { methods })

    assert.equal(fields.user_id.lookup.tx, 120)
    assert.equal(fields.user_id.lookup.name, 'UserBO.getAll')
    assert.equal(fields.user_id.lookup.valueKey, 'user_id')
    assert.equal(fields.user_id.lookup.labelKey, 'user_na')

    assert.equal(fields.category.lookup.tx, 121)
    assert.equal(fields.category.lookup.name, 'CategoryBO.list')
})

test('extractSchemaFieldsFromSource lookup inference prefers list/getAll over get', () => {
    const source = `
        import { z } from 'zod'
        export const LoanSchemas = {
            create: z.object({
                user_id: z.coerce.number().optional()
            })
        }
    `

    const methods = [
        {
            className: 'UserBO',
            methodName: 'get',
            schemaKey: 'get',
            tx: 99,
            boFile: 'BO/User/UserBO.ts',
            schemaContent: `
                export const UserSchemas = {
                    get: z.object({ user_id: z.coerce.number() })
                }
            `,
        },
        {
            className: 'UserBO',
            methodName: 'getAll',
            schemaKey: 'getAll',
            tx: 100,
            boFile: 'BO/User/UserBO.ts',
            schemaContent: `
                export const UserSchemas = {
                    getAll: z.object({ user_id: z.coerce.number().optional() })
                }
            `,
        },
    ]

    const fields = extractSchemaFieldsFromSource(source, 'create', { methods })
    assert.equal(fields.user_id.lookup.tx, 100)
    assert.equal(fields.user_id.lookup.name, 'UserBO.getAll')
})
