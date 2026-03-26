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

    const reportType = z.enum(['overdue_loans', 'solvency', 'devolution_stats'])

    return {
        get: z.object({
            id: z.coerce.number().int().positive(),
        }),
        getAll: z.object({
            report_ty: reportType.optional(),
        }),
        create: z.object({
            report_ty: reportType,
            user_id: z.coerce.number().int().positive().optional(),
            lapse_id: z.coerce.number().int().positive().optional(),
            from_dt: z.coerce.date().optional(),
            to_dt: z.coerce.date().optional(),
        }),
        update: z.object({
            id: z.coerce.number().int().positive(),
            user_id: z.coerce.number().int().positive().optional(),
            lapse_id: z.coerce.number().int().positive().optional(),
            from_dt: z.coerce.date().optional(),
            to_dt: z.coerce.date().optional(),
        }).refine(
            (data) =>
                data.user_id !== undefined ||
                data.lapse_id !== undefined ||
                data.from_dt !== undefined ||
                data.to_dt !== undefined,
            { message: validation.requiredField }
        ),
        delete: z.object({
            id: z.coerce.number().int().positive(),
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
