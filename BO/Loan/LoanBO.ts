import { BaseBO } from '@toproc/bo'
import { formatCaracasDateTime } from '@toproc/utils'
import type { IContainer, ApiResponse } from '@toproc/types'
import { LoanService, LoanMessages, LoanSchemas, Inputs, Types, registerLoan } from './LoanModule.js'

/**
 * Business Object para el dominio Loan.
 * Orquesta transacciones de Loan y expone endpoints de API.
 */
export class LoanBO extends BaseBO {
    private service: LoanService

    constructor(container: IContainer) {
        super(container)
        registerLoan(container)
        this.service = container.resolve<LoanService>('LoanService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get loanMessages() {
        return this.i18n.use(LoanMessages)
    }

    private formatDateTime(value: unknown): unknown {
        return formatCaracasDateTime(value, this.i18n.currentLocale) ?? value
    }

    private formatTrace(trace?: Types.TraceEntry[]): Types.TraceEntry[] | undefined {
        if (!trace) return trace
        return trace.map((entry) => ({
            ...entry,
            at: this.formatDateTime(entry.at) as string,
        }))
    }

    async getRequest(params: Inputs.GetRequestInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetRequestInput, Types.Request>(
            params,
            LoanSchemas.getRequest,
            async (data) => {
                const result: Types.RequestDetail = await this.service.getRequest(data)
                const formatted: Types.RequestDetail = {
                    ...result,
                    movement_booking_dt: this.formatDateTime(result.movement_booking_dt) as string,
                    movement_estimated_return_dt: this.formatDateTime(
                        result.movement_estimated_return_dt
                    ) as string,
                    details: (result.details ?? []).map((detail) => ({
                        ...detail,
                        movement_detail_dt: this.formatDateTime(detail.movement_detail_dt) as string,
                    })),
                    trace: this.formatTrace(result.trace),
                }
                return this.success(formatted, this.loanMessages.getRequest)
            }
        )
    }

    async getAllRequests(params: Inputs.GetAllRequestsInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetAllRequestsInput, Array<Types.RequestSummary>>(
            params,
            LoanSchemas.getAllRequests,
            async (data) => {
                const result: Array<Types.RequestSummary> = await this.service.getAllRequests(data)
                const formatted = result.map((item) => ({
                    ...item,
                    movement_booking_dt: this.formatDateTime(item.movement_booking_dt) as string,
                    movement_estimated_return_dt: this.formatDateTime(
                        item.movement_estimated_return_dt
                    ) as string,
                }))
                return this.success(formatted, this.loanMessages.getAllRequests)
            }
        )
    }

    async requestLoan(params: Inputs.RequestLoanInput): Promise<ApiResponse> {
        return this.exec<Inputs.RequestLoanInput, Types.Request>(
            params,
            LoanSchemas.requestLoan,
            async (data) => {
                const result = await this.service.requestLoan(data)
                return this.created(result, this.loanMessages.requestLoan)
            }
        )
    }

    async acceptRequestLoan(params: Inputs.AcceptRequestLoanInput): Promise<ApiResponse> {
        return this.exec<Inputs.AcceptRequestLoanInput, Types.Request>(
            params,
            LoanSchemas.acceptRequestLoan,
            async (data) => {
                const result = await this.service.acceptRequestLoan(data)
                const formatted = {
                    ...result,
                    movement_booking_dt: this.formatDateTime(result.movement_booking_dt) as string,
                    movement_estimated_return_dt: this.formatDateTime(
                        result.movement_estimated_return_dt
                    ) as string,
                }
                return this.success(formatted, this.loanMessages.acceptRequestLoan)
            }
        )
    }

    async rejectRequestLoan(params: Inputs.RejectRequestLoanInput): Promise<ApiResponse> {
        return this.exec<Inputs.RejectRequestLoanInput, Types.Request>(
            params,
            LoanSchemas.rejectRequestLoan,
            async (data) => {
                const result = await this.service.rejectRequestLoan(data)
                const formatted = {
                    ...result,
                    movement_booking_dt: this.formatDateTime(result.movement_booking_dt) as string,
                    movement_estimated_return_dt: this.formatDateTime(
                        result.movement_estimated_return_dt
                    ) as string,
                }
                return this.success(formatted, this.loanMessages.rejectRequestLoan)
            }
        )
    }

    async getLoan(params: Inputs.GetLoanInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetLoanInput, Types.LoanDetail>(
            params,
            LoanSchemas.getLoan,
            async (data) => {
                const result = await this.service.getLoan(data)
                const formatted: Types.LoanDetail = {
                    ...result,
                    movement_booking_dt: this.formatDateTime(result.movement_booking_dt) as string,
                    movement_estimated_return_dt: this.formatDateTime(
                        result.movement_estimated_return_dt
                    ) as string,
                    details: (result.details ?? []).map((detail) => ({
                        ...detail,
                        movement_detail_dt: this.formatDateTime(detail.movement_detail_dt) as string,
                    })),
                    trace: this.formatTrace(result.trace),
                }
                return this.success(formatted, this.loanMessages.getLoan)
            }
        )
    }

    async getAllLoans(params: Inputs.GetAllLoansInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetAllLoansInput, Array<Types.LoanSummary>>(
            params,
            LoanSchemas.getAllLoans,
            async (data) => {
                const result = await this.service.getAllLoans(data)
                const formatted = result.map((item) => ({
                    ...item,
                    movement_booking_dt: this.formatDateTime(item.movement_booking_dt) as string,
                    movement_estimated_return_dt: this.formatDateTime(
                        item.movement_estimated_return_dt
                    ) as string,
                }))
                return this.success(formatted, this.loanMessages.getAllLoans)
            }
        )
    }

    async registerLoan(params: Inputs.RegisterLoanInput): Promise<ApiResponse> {
        return this.exec<Inputs.RegisterLoanInput, Types.LoanDetail>(
            params,
            LoanSchemas.registerLoan,
            async (data) => {
                const result = await this.service.registerLoan(data)
                const formatted: Types.LoanDetail = {
                    ...result,
                    movement_booking_dt: this.formatDateTime(result.movement_booking_dt) as string,
                    movement_estimated_return_dt: this.formatDateTime(
                        result.movement_estimated_return_dt
                    ) as string,
                    details: (result.details ?? []).map((detail) => ({
                        ...detail,
                        movement_detail_dt: this.formatDateTime(detail.movement_detail_dt) as string,
                    })),
                    trace: this.formatTrace(result.trace),
                }
                return this.success(formatted, this.loanMessages.registerLoan)
            }
        )
    }
}
