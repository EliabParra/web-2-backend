import { z } from 'zod'
import { LoanMessages } from './LoanMessages.js'

/**
 * Schemas Zod para métodos de LoanBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type LoanMessagesSet = typeof LoanMessages.es

export const createLoanSchemas = (messages: LoanMessagesSet = LoanMessages.es) => {
    const validation = messages.validation ?? LoanMessages.es.validation

    return {
    get: z.object({
        id: z.coerce.number(),
    }),
    getAll: z.object({
        // Parámetros de paginación o filtros opcionales
    }),
    create: z.object({
        // TODO: Definir validación. Usa messages.validation.xxx
    }),
    update: z.object({
        id: z.coerce.number(),
    }),
    delete: z.object({
        id: z.coerce.number(),
    }),
    }
}

export const LoanSchemas = createLoanSchemas(LoanMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof LoanSchemas.get>
export type GetAllInput = z.infer<typeof LoanSchemas.getAll>
export type CreateInput = z.infer<typeof LoanSchemas.create>
export type UpdateInput = z.infer<typeof LoanSchemas.update>
export type DeleteInput = z.infer<typeof LoanSchemas.delete>
