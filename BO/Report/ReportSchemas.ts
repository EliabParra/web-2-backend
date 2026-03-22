import { z } from 'zod'
import { ReportMessages } from './ReportMessages.js'

/**
 * Schemas Zod para métodos de ReportBO
 *
 * Los mensajes de validación se derivan del set de mensajes del BO.
 */
export type ReportMessagesSet = typeof ReportMessages.es

export const createReportSchemas = (messages: ReportMessagesSet = ReportMessages.es) => {
    const validation = messages.validation ?? ReportMessages.es.validation

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

export const ReportSchemas = createReportSchemas(ReportMessages.es)

// Exporta schemas individuales para inferencia de tipos
export type GetInput = z.infer<typeof ReportSchemas.get>
export type GetAllInput = z.infer<typeof ReportSchemas.getAll>
export type CreateInput = z.infer<typeof ReportSchemas.create>
export type UpdateInput = z.infer<typeof ReportSchemas.update>
export type DeleteInput = z.infer<typeof ReportSchemas.delete>
