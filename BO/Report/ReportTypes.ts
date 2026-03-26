/**
 * Definiciones de tipos para Report
 */

export namespace Report {
    export type ReportType = 'overdue_loans' | 'solvency' | 'devolution_stats'

    export type ReportFilters = {
        user_id?: number
        lapse_id?: number
        from_dt?: string | Date
        to_dt?: string | Date
    }

    export type Entity = {
        id: number
        report_ty: ReportType
        report_na: string
        generated_dt: string | Date
        filters: ReportFilters
        data: Array<Record<string, unknown>>
        summary: Record<string, number>
    }

    export type Summary = {
        id: number
        report_ty: ReportType
        report_na: string
        report_de: string
    }

    export interface CreateInput {
        report_ty: ReportType
        user_id?: number
        lapse_id?: number
        from_dt?: string | Date
        to_dt?: string | Date
    }

    export interface UpdateInput {
        id: number
        user_id?: number
        lapse_id?: number
        from_dt?: string | Date
        to_dt?: string | Date
    }

    export interface GetInput {
        id: number
    }

    export interface GetAllInput {
        report_ty?: ReportType
    }

    export interface DeleteInput {
        id: number
    }

    export type RowCount = {
        rowCount: number
    }

    export type Exists = {
        exists: boolean
    }

    // ============================================================
    // Contratos (Service/Repository)
    // ============================================================

    export interface Repository {
        findAll(filters?: GetAllInput): Promise<Summary[]>
        findById(id: number): Promise<Entity | null>
        create(data: CreateInput): Promise<Entity | null>
        update(id: number, data: UpdateInput): Promise<Entity | null>
        delete(id: number): Promise<boolean>
        exists(id: number): Promise<boolean>
    }

    export interface Service {
        getAll(filters?: GetAllInput): Promise<Summary[]>
        getById(id: number): Promise<Entity>
        create(data: CreateInput): Promise<Entity>
        update(id: number, data: UpdateInput): Promise<Entity>
        delete(id: number): Promise<void>
    }
}

export type Report = Report.Entity
export type ReportSummary = Report.Summary
export type ReportType = Report.ReportType
export type ReportFilters = Report.ReportFilters
export type CreateReportInput = Report.CreateInput
export type UpdateReportInput = Report.UpdateInput
export type GetReportInput = Report.GetInput
export type GetAllReportInput = Report.GetAllInput
export type DeleteReportInput = Report.DeleteInput

export type RowCountReport = Report.RowCount
export type ExistsReport = Report.Exists
export type IReportRepository = Report.Repository
export type IReportService = Report.Service
