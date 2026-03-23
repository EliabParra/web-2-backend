import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { LoanRepository, Errors, LoanMessages, Types } from './LoanModule.js'

/**
 * Capa de servicio para lógica de negocio de Loan.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./LoanErrors.js
 */
export class LoanService extends BOService implements Types.ILoanService {
    private repo: LoanRepository
    private readonly REQUEST_PENDING_TYPE_ID = 1 // Solicitado
    private readonly REQUEST_ACCEPTED_TYPE_ID = 2 // Aceptado
    private readonly REQUEST_REJECTED_TYPE_ID = 3 // Rechazado
    private readonly LOAN_TYPE_ID = 4 // Prestado
    private readonly REQUEST_TYPE_IDS = [
        this.REQUEST_PENDING_TYPE_ID,
        this.REQUEST_ACCEPTED_TYPE_ID,
        this.REQUEST_REJECTED_TYPE_ID,
    ]

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<LoanRepository>('LoanRepository')
    }

    private get messages() {
        return this.i18n.use(LoanMessages)
    }

    private buildTraceFromRequest(request: Types.Request): Types.TraceEntry[] {
        const trace: Types.TraceEntry[] = []

        if (request.movement_booking_dt) {
            trace.push({
                at: request.movement_booking_dt,
                action: 'request_created',
                note: request.movement_ob ?? undefined,
                actor_user_id: request.user_id,
            })
        }

        if (request.movement_estimated_return_dt) {
            trace.push({
                at: request.movement_estimated_return_dt,
                action: 'estimated_return_set',
            })
        }

        return trace
    }

    private buildTraceFromLoan(loan: Types.Loan, details: Types.LoanDetailLine[]): Types.TraceEntry[] {
        const trace = this.buildTraceFromRequest(loan)

        for (const detail of details) {
            if (!detail.movement_detail_dt) continue
            trace.push({
                at: detail.movement_detail_dt,
                action: 'loan_detail_registered',
                note: detail.movement_detail_ob ?? `${detail.item_na ?? 'item'} x${detail.movement_detail_am}`,
            })
        }

        return trace.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    }

    async getRequest(params: Types.GetRequestInput): Promise<Types.RequestDetail> {
        const request = await this.repo.findRequestById(params.movement_id, this.REQUEST_TYPE_IDS)
        if (!request) {
            throw new Errors.LoanError(this.messages.requestNotFound, 'REQUEST_NOT_FOUND', 404, {
                movement_id: params.movement_id,
            })
        }

        if (!params.include_trace) return request
        return {
            ...request,
            trace: this.buildTraceFromRequest(request),
        }
    }

    async getAllRequests(params: Types.GetAllRequestsInput): Promise<Types.RequestSummary[]> {
        return this.repo.findAllRequests(params, this.REQUEST_TYPE_IDS)
    }

    async requestLoan(params: Types.RequestLoanInput): Promise<Types.Request> {
        const activeLapseId = await this.repo.getActiveLapseId()

        if (!activeLapseId) {
            throw new Errors.LoanError(
                this.messages.lapseNotFound,
                'LOAN_ACTIVE_LAPSE_NOT_FOUND',
                400
            )
        }

        return this.repo.createRequest(params, this.REQUEST_PENDING_TYPE_ID, activeLapseId)
    }

    async acceptRequestLoan(params: Types.AcceptRequestLoanInput): Promise<Types.Request> {
        const current = await this.repo.findRequestById(params.movement_id, this.REQUEST_TYPE_IDS)
        if (!current) {
            throw new Errors.LoanError(this.messages.requestNotFound, 'REQUEST_NOT_FOUND', 404, {
                movement_id: params.movement_id,
            })
        }

        if (current.movement_type_id !== this.REQUEST_PENDING_TYPE_ID) {
            throw new Errors.LoanInvalidStateError(this.messages.requestNotPending, {
                movement_id: params.movement_id,
                movement_type_id: current.movement_type_id,
            })
        }

        const accepted = await this.repo.acceptRequest(params, this.REQUEST_ACCEPTED_TYPE_ID)
        if (!accepted) {
            throw new Errors.LoanNotFoundError(params.movement_id)
        }
        return accepted
    }

    async rejectRequestLoan(params: Types.RejectRequestLoanInput): Promise<Types.Request> {
        const current = await this.repo.findRequestById(params.movement_id, this.REQUEST_TYPE_IDS)
        if (!current) {
            throw new Errors.LoanError(this.messages.requestNotFound, 'REQUEST_NOT_FOUND', 404, {
                movement_id: params.movement_id,
            })
        }

        if (current.movement_type_id !== this.REQUEST_PENDING_TYPE_ID) {
            throw new Errors.LoanInvalidStateError(this.messages.requestNotPending, {
                movement_id: params.movement_id,
                movement_type_id: current.movement_type_id,
            })
        }

        const rejected = await this.repo.rejectRequest(params, this.REQUEST_REJECTED_TYPE_ID)
        if (!rejected) {
            throw new Errors.LoanNotFoundError(params.movement_id)
        }
        return rejected
    }

    async getLoan(params: Types.GetLoanInput): Promise<Types.LoanDetail> {
        const loan = await this.repo.findLoanById(params.movement_id, this.LOAN_TYPE_ID)
        if (!loan) {
            throw new Errors.LoanError(this.messages.loanNotFound, 'LOAN_NOT_FOUND', 404, {
                movement_id: params.movement_id,
            })
        }

        const details = await this.repo.findLoanDetails(params.movement_id)
        const enriched: Types.LoanDetail = {
            ...loan,
            details,
        }

        if (!params.include_trace) return enriched
        return {
            ...enriched,
            trace: this.buildTraceFromLoan(enriched, details),
        }
    }

    async getAllLoans(params: Types.GetAllLoansInput): Promise<Types.LoanSummary[]> {
        return this.repo.findAllLoans(params, this.LOAN_TYPE_ID)
    }

    async registerLoan(params: Types.RegisterLoanInput): Promise<Types.LoanDetail> {
        const request = await this.repo.findRequestById(params.movement_id, this.REQUEST_TYPE_IDS)
        if (!request) {
            throw new Errors.LoanError(this.messages.requestNotFound, 'REQUEST_NOT_FOUND', 404, {
                movement_id: params.movement_id,
            })
        }

        if (request.movement_type_id !== this.REQUEST_ACCEPTED_TYPE_ID) {
            throw new Errors.LoanInvalidStateError(this.messages.requestNotAccepted, {
                movement_id: params.movement_id,
                movement_type_id: request.movement_type_id,
            })
        }

        for (const detail of params.details) {
            const stockRow = await this.repo.findInventoryById(detail.inventory_id)
            if (!stockRow) {
                throw new Errors.LoanValidationError([
                    `${this.messages.validation.inventory.required}: ${detail.inventory_id}`,
                ])
            }
        }

        let updatedMovement: Types.Loan
        let details: Types.LoanDetailLine[]

        try {
            const result = await this.repo.registerLoanAtomic(params, this.LOAN_TYPE_ID)
            updatedMovement = result.movement
            details = result.details
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'MOVEMENT_NOT_FOUND') {
                throw new Errors.LoanNotFoundError(params.movement_id)
            }

            const candidate = err as Error & {
                inventory_id?: number
                requested?: number
            }
            if (candidate.inventory_id != null) {
                throw new Errors.LoanStockInsufficientError({
                    inventory_id: candidate.inventory_id,
                    requested: candidate.requested,
                })
            }
            throw err
        }

        return {
            ...updatedMovement,
            details,
            trace: this.buildTraceFromLoan(
                { ...updatedMovement, details },
                details
            ),
        }
    }
}
