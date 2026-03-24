import { z } from 'zod'
import { normalizeDateTimeInput } from '@toproc/utils'
import { LoanMessages } from './LoanMessages.js'

/**
 * Schemas Zod para métodos de LoanBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type LoanMessagesSet = typeof LoanMessages.es

export const createLoanSchemas = (messages: LoanMessagesSet = LoanMessages.es) => {
    const validation = messages.validation ?? LoanMessages.es.validation
    const dateTimeInput = z.union([z.string(), z.date()]).transform((value, ctx) => {
        const normalized = normalizeDateTimeInput(value)
        if (!normalized) {
            ctx.addIssue({
                code: 'custom',
                message: validation.invalidFormat,
            })
            return z.NEVER
        }
        return normalized
    })

    return {
    getRequest: z.object({
        movement_id: z.coerce.number().int(),
        include_trace: z.boolean().optional(),
    }),
    getAllRequests: z.object({
        user_id: z.coerce.number().int().optional(),
        lapse_id: z.coerce.number().int().optional(),
        from_dt: dateTimeInput.optional(),
        to_dt: dateTimeInput.optional(),
    }),
    requestLoan: z.object({
        user_id: z.coerce.number().int().min(1, validation.user.required),
        movement_ob: z.string().min(1, validation.observation.required),
    }),
    acceptRequestLoan: z.object({
        movement_id: z.coerce.number().int(),
        movement_estimated_return_dt: dateTimeInput,
        movement_ob: z.string().optional(),
        actor_user_id: z.coerce.number().int().optional(),
    }),
    rejectRequestLoan: z.object({
        movement_id: z.coerce.number().int(),
        movement_ob: z.string().min(1, validation.observation.required),
        actor_user_id: z.coerce.number().int().optional(),
    }),
    getLoan: z.object({
        movement_id: z.coerce.number().int(),
        include_trace: z.boolean().optional(),
    }),
    getAllLoans: z.object({
        user_id: z.coerce.number().int().optional(),
        lapse_id: z.coerce.number().int().optional(),
        from_dt: dateTimeInput.optional(),
        to_dt: dateTimeInput.optional(),
    }),
    registerLoan: z.object({
        movement_id: z.coerce.number().int(),
        movement_booking_dt: dateTimeInput.optional(),
        movement_ob: z.string().optional(),
        actor_user_id: z.coerce.number().int().optional(),
        details: z.array(
            z.object({
                inventory_id: z.coerce.number().int().min(1, validation.inventory.required),
                movement_detail_am: z.coerce.number().int().min(1, validation.quantity.min),
                movement_detail_ob: z.string().optional(),
            })
        ).min(1, validation.details.required),
    }),
    }
}

export const LoanSchemas = createLoanSchemas(LoanMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetRequestInput = z.infer<typeof LoanSchemas.getRequest>
export type GetAllRequestsInput = z.infer<typeof LoanSchemas.getAllRequests>
export type RequestLoanInput = z.infer<typeof LoanSchemas.requestLoan>
export type AcceptRequestLoanInput = z.infer<typeof LoanSchemas.acceptRequestLoan>
export type RejectRequestLoanInput = z.infer<typeof LoanSchemas.rejectRequestLoan>
export type GetLoanInput = z.infer<typeof LoanSchemas.getLoan>
export type GetAllLoansInput = z.infer<typeof LoanSchemas.getAllLoans>
export type RegisterLoanInput = z.infer<typeof LoanSchemas.registerLoan>
