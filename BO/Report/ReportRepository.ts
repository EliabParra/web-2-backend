import { IDatabase } from '@toproc/types'
import { ReportQueries, Types } from './ReportModule.js'

/**
 * Repositorio para operaciones de base de datos de ReportBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class ReportRepository implements Types.IReportRepository {
    private readonly catalog: Types.ReportSummary[] = [
        {
            id: 1,
            report_ty: 'overdue_loans',
            report_na: 'Préstamos vencidos',
            report_de: 'Consolidado por usuario de préstamos vencidos e ítems pendientes.',
        },
        {
            id: 2,
            report_ty: 'solvency',
            report_na: 'Solvencia por usuario',
            report_de: 'Estado de solvencia según préstamos activos y vencidos.',
        },
        {
            id: 3,
            report_ty: 'devolution_stats',
            report_na: 'Estadísticas de devoluciones',
            report_de: 'Distribución de estados de devolución registrados.',
        },
    ]

    constructor(private readonly db: IDatabase) {}

    private mapFilters(input: Types.CreateReportInput | Types.UpdateReportInput): Types.ReportFilters {
        return {
            user_id: input.user_id,
            lapse_id: input.lapse_id,
            from_dt: input.from_dt,
            to_dt: input.to_dt,
        }
    }

    private resolveTypeFromId(id: number): Types.ReportType | null {
        const item = this.catalog.find((entry) => entry.id === id)
        return item?.report_ty ?? null
    }

    private async getMovementTypeId(keyword: string): Promise<number | null> {
        const result = await this.db.query<{ movement_type_id: number }>(ReportQueries.findMovementTypeIdByKeyword, [
            keyword,
        ])
        return result.rows[0]?.movement_type_id ?? null
    }

    private buildEntity(
        summary: Types.ReportSummary,
        filters: Types.ReportFilters,
        data: Array<Record<string, unknown>>,
        summaryMetrics: Record<string, number>
    ): Types.Report {
        return {
            id: summary.id,
            report_ty: summary.report_ty,
            report_na: summary.report_na,
            generated_dt: new Date().toISOString(),
            filters,
            data,
            summary: summaryMetrics,
        }
    }

    async findAll(filters: Types.GetAllReportInput = {}): Promise<Types.ReportSummary[]> {
        if (!filters.report_ty) {
            return this.catalog
        }

        return this.catalog.filter((item) => item.report_ty === filters.report_ty)
    }

    async findById(id: number): Promise<Types.Report | null> {
        const reportType = this.resolveTypeFromId(id)
        if (!reportType) {
            return null
        }

        return this.create({ report_ty: reportType })
    }

    async create(data: Types.CreateReportInput): Promise<Types.Report | null> {
        const catalogItem = this.catalog.find((item) => item.report_ty === data.report_ty)
        if (!catalogItem) {
            return null
        }

        const filters = this.mapFilters(data)
        if (data.report_ty === 'overdue_loans') {
            const loanedTypeId = await this.getMovementTypeId('loan')
            if (!loanedTypeId) {
                return this.buildEntity(catalogItem, filters, [], {
                    total_users: 0,
                    total_loans_overdue: 0,
                    total_items_overdue: 0,
                })
            }

            const result = await this.db.query<Record<string, unknown>>(ReportQueries.overdueLoansByUser, [
                loanedTypeId,
                data.user_id ?? null,
                data.lapse_id ?? null,
                data.from_dt ?? null,
                data.to_dt ?? null,
            ])

            const totalLoans = result.rows.reduce((acc, row) => acc + Number(row.loans_overdue ?? 0), 0)
            const totalItems = result.rows.reduce((acc, row) => acc + Number(row.items_overdue ?? 0), 0)

            return this.buildEntity(catalogItem, filters, result.rows, {
                total_users: result.rows.length,
                total_loans_overdue: totalLoans,
                total_items_overdue: totalItems,
            })
        }

        if (data.report_ty === 'solvency') {
            const loanedTypeId = await this.getMovementTypeId('loan')
            if (!loanedTypeId) {
                return this.buildEntity(catalogItem, filters, [], {
                    total_users: 0,
                    solvent_users: 0,
                    insolvent_users: 0,
                })
            }

            const result = await this.db.query<Record<string, unknown>>(ReportQueries.solvencyByUser, [
                loanedTypeId,
                data.user_id ?? null,
                data.lapse_id ?? null,
                data.from_dt ?? null,
                data.to_dt ?? null,
            ])

            const rows = result.rows.map((row) => {
                const activeLoans = Number(row.active_loans ?? 0)
                const overdueLoans = Number(row.overdue_loans ?? 0)
                return {
                    ...row,
                    is_solvency_ok: activeLoans === 0 && overdueLoans === 0,
                }
            })

            const solventUsers = rows.filter((row) => Boolean(row.is_solvency_ok)).length

            return this.buildEntity(catalogItem, filters, rows, {
                total_users: rows.length,
                solvent_users: solventUsers,
                insolvent_users: rows.length - solventUsers,
            })
        }

        const result = await this.db.query<Record<string, unknown>>(ReportQueries.devolutionStats, [
            data.user_id ?? null,
            data.lapse_id ?? null,
            data.from_dt ?? null,
            data.to_dt ?? null,
        ])

        const row = result.rows[0] ?? {
            total_events: 0,
            completed_events: 0,
            partial_events: 0,
            damaged_events: 0,
        }

        return this.buildEntity(catalogItem, filters, [row], {
            total_events: Number(row.total_events ?? 0),
            completed_events: Number(row.completed_events ?? 0),
            partial_events: Number(row.partial_events ?? 0),
            damaged_events: Number(row.damaged_events ?? 0),
        })
    }

    async update(id: number, data: Types.UpdateReportInput): Promise<Types.Report | null> {
        const reportType = this.resolveTypeFromId(id)
        if (!reportType) {
            return null
        }

        return this.create({
            report_ty: reportType,
            user_id: data.user_id,
            lapse_id: data.lapse_id,
            from_dt: data.from_dt,
            to_dt: data.to_dt,
        })
    }

    async delete(id: number): Promise<boolean> {
        const exists = this.catalog.some((item) => item.id === id)
        return exists
    }

    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsReport>(ReportQueries.alwaysExists, [])
        return Boolean(this.catalog.some((item) => item.id === id) && result.rows[0]?.exists)
    }
}
