import { BOService } from '@toproc/bo'
import type { IContainer, IWebSocketService } from '@toproc/types'
import { LoanRepository, Errors, LoanMessages, Types } from './LoanModule.js'

/**
 * Capa de servicio para lógica de negocio de Loan.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./LoanErrors.js
 */
export class LoanService extends BOService implements Types.ILoanService {
    private repo: LoanRepository
    private readonly websocket: IWebSocketService | null
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
        this.websocket = container.has('websocket')
            ? container.resolve<IWebSocketService>('websocket')
            : null
    }

    private get messages() {
        return this.i18n.use(LoanMessages)
    }

    private normalizeDetail(detail: Types.RegisterLoanDetailInput): string {
        return `${detail.inventory_id}:${detail.movement_detail_am}:${detail.movement_detail_ob ?? ''}`
    }

    private areDetailsEqual(
        original: Types.RegisterLoanDetailInput[],
        candidate: Types.RegisterLoanDetailInput[]
    ): boolean {
        if (original.length !== candidate.length) return false
        const left = [...original].map((d) => this.normalizeDetail(d)).sort()
        const right = [...candidate].map((d) => this.normalizeDetail(d)).sort()
        return left.every((item, idx) => item === right[idx])
    }

    private buildDetailsOverrideAudit(
        actorUserId: number | undefined,
        original: Types.RegisterLoanDetailInput[],
        override: Types.RegisterLoanDetailInput[]
    ): string {
        return JSON.stringify({
            action: 'details_override',
            at: new Date().toISOString(),
            actor_user_id: actorUserId ?? null,
            before: original,
            after: override,
        })
    }

    private appendAuditToObservation(baseObservation: string | undefined, audit: string): string {
        const base = (baseObservation ?? '').trim()
        return base.length > 0 ? `${base}\n[AUDIT] ${audit}` : `[AUDIT] ${audit}`
    }

    private mapLoanDetailsToRegisterInputs(
        details: Types.LoanDetailLine[]
    ): Types.RegisterLoanDetailInput[] {
        return details.map((detail) => ({
            inventory_id: detail.inventory_id,
            movement_detail_am: detail.movement_detail_am,
            movement_detail_ob: detail.movement_detail_ob ?? undefined,
        }))
    }

    private buildTraceFromRequest(
        request: Types.Request,
        details: Types.LoanDetailLine[] = []
    ): Types.TraceEntry[] {
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

        for (const detail of details) {
            if (!detail.movement_detail_dt) continue
            trace.push({
                at: detail.movement_detail_dt,
                action: 'request_detail_registered',
                note: detail.movement_detail_ob ?? `${detail.item_na ?? 'item'} x${detail.movement_detail_am}`,
            })
        }

        return trace.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
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

        const details = await this.repo.findLoanDetails(params.movement_id)

        const enriched: Types.RequestDetail = {
            ...request,
            details,
        }

        if (!params.include_trace) return enriched
        return {
            ...enriched,
            trace: this.buildTraceFromRequest(request, details),
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

        const created = await this.repo.createRequest(
            params,
            this.REQUEST_PENDING_TYPE_ID,
            activeLapseId
        )

        await this.notifySupervisorsNewRequest(created)
        return created
    }

    private async notifySupervisorsNewRequest(request: Types.Request): Promise<void> {
        try {
            const result = await this.db.query<{
                notification_id: number
                notification_ty: string | null
                notification_tit: string | null
                notification_dt: string | Date
                user_id: number
            }>(
                `
                INSERT INTO business.notification (
                    notification_ty,
                    notification_tit,
                    notification_msg,
                    user_id
                )
                SELECT
                    'loan_request',
                    'Nueva solicitud de préstamo',
                    $1,
                    sup.user_id
                FROM (
                    SELECT DISTINCT up.user_id
                    FROM security.user_profile up
                    INNER JOIN security.profile p ON p.profile_id = up.profile_id
                    WHERE LOWER(p.profile_na) = 'supervisor'
                ) sup
                RETURNING
                    notification_id,
                    notification_ty,
                    notification_tit,
                    notification_dt,
                    user_id
                `,
                [`Se creó la solicitud #${request.movement_id} y está pendiente de aprobación.`]
            )

            for (const createdNotification of result.rows) {
                this.websocket?.emitToUser(String(createdNotification.user_id), 'notification.created', {
                    notification_id: createdNotification.notification_id,
                    notification_ty: createdNotification.notification_ty,
                    notification_tit: createdNotification.notification_tit,
                    notification_dt: createdNotification.notification_dt,
                    user_id: createdNotification.user_id,
                })
            }
        } catch (err) {
            this.log.warn('No se pudo notificar a supervisores por nueva solicitud', {
                movement_id: request.movement_id,
                error: err instanceof Error ? err.message : String(err),
            })
        }
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

        const originalDetails = this.mapLoanDetailsToRegisterInputs(
            await this.repo.findLoanDetails(params.movement_id)
        )

        const effectiveDetails = params.details?.length ? params.details : originalDetails

        if (effectiveDetails.length === 0) {
            throw new Errors.LoanValidationError([this.messages.validation.details.required])
        }

        for (const detail of effectiveDetails) {
            const stockRow = await this.repo.findInventoryById(detail.inventory_id)
            if (!stockRow) {
                throw new Errors.LoanValidationError([
                    `${this.messages.validation.inventory.required}: ${detail.inventory_id}`,
                ])
            }
        }

        let movementObservation = params.movement_ob
        if (params.details?.length && !this.areDetailsEqual(originalDetails, params.details)) {
            const audit = this.buildDetailsOverrideAudit(
                params.actor_user_id,
                originalDetails,
                params.details
            )
            movementObservation = this.appendAuditToObservation(params.movement_ob, audit)
        }

        let updatedMovement: Types.Loan
        let details: Types.LoanDetailLine[]

        try {
            const result = await this.repo.registerLoanAtomic(
                {
                    ...params,
                    movement_ob: movementObservation,
                    details: effectiveDetails,
                },
                this.LOAN_TYPE_ID
            )
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
