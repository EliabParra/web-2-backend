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
