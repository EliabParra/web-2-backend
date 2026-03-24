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

    assert.equal(fields.code.type, 'number')
    assert.equal(fields.code.optional, false)
})
