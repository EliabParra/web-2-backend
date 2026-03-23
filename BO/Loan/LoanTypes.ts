/**
 * Definiciones de tipos para Loan
 *
 * Flujo:
 * - Request: movement de tipo solicitud sin movement_detail.
 * - Loan: movement de tipo préstamo con movement_detail e impacto en inventario.
 */

export namespace Loan {
    // ============================================================
    // Entidades de Dominio
    // ============================================================

    export type Request = {
        movement_id: number
        movement_booking_dt?: string | Date | null
        movement_estimated_return_dt?: string | Date | null
        movement_ob?: string | null
        user_id: number
        movement_type_id: number
        movement_type_de?: string
        lapse_id: number
        lapse_de?: string
    }

    export type RequestSummary = {
        movement_id: number
        user_id: number
        movement_ob?: string | null
        movement_booking_dt?: string | Date | null
        movement_estimated_return_dt?: string | Date | null
        movement_type_id: number
        movement_type_de?: string
        lapse_id: number
        lapse_de?: string
    }

    export type LoanDetailLine = {
        movement_detail_id: number
        movement_detail_dt?: string | Date | null
        movement_detail_am: number
        movement_detail_ob?: string | null
        inventory_id: number
        movement_id: number
        item_id?: number
        item_cod?: number
        item_na?: string
        location_id?: number
        location_de?: string
        inventory_qt?: number
    }

    export type LoanEntity = Request & {
        details?: LoanDetailLine[]
    }

    export type LoanSummary = {
        movement_id: number
        user_id: number
        movement_booking_dt?: string | Date | null
        movement_estimated_return_dt?: string | Date | null
        lapse_id: number
        lapse_de?: string
        movement_type_id: number
        movement_type_de?: string
        total_items?: number
    }

    export type TraceEntry = {
        at: string | Date
        action: string
        note?: string | null
        actor_user_id?: number | null
    }

    export type RequestDetail = Request & {
        trace?: TraceEntry[]
    }

    export type LoanDetail = LoanEntity & {
        trace?: TraceEntry[]
    }

    export type InventoryStockRow = {
        inventory_id: number
        inventory_qt: number
        item_id: number
        item_na?: string
        item_cod?: number
        category_type_id?: number
    }

    // ============================================================
    // Inputs
    // ============================================================

    export interface GetRequestInput {
        movement_id: number
        include_trace?: boolean
    }

    export interface GetAllRequestsInput {
        user_id?: number
        lapse_id?: number
        from_dt?: string
        to_dt?: string
    }

    export interface RequestLoanInput {
        user_id: number
        movement_ob: string
    }

    export interface AcceptRequestLoanInput {
        movement_id: number
        movement_estimated_return_dt: string
        movement_ob?: string
        actor_user_id?: number
    }

    export interface RejectRequestLoanInput {
        movement_id: number
        movement_ob: string
        actor_user_id?: number
    }

    export interface RegisterLoanDetailInput {
        inventory_id: number
        movement_detail_am: number
        movement_detail_ob?: string
    }

    export interface RegisterLoanInput {
        movement_id: number
        movement_booking_dt?: string
        movement_ob?: string
        actor_user_id?: number
        details: RegisterLoanDetailInput[]
    }

    export interface GetLoanInput {
        movement_id: number
        include_trace?: boolean
    }

    export interface GetAllLoansInput {
        user_id?: number
        lapse_id?: number
        from_dt?: string
        to_dt?: string
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
        getMovementTypeIdByKeyword(keyword: string): Promise<number | null>
        getActiveLapseId(): Promise<number | null>

        findRequestById(movementId: number, requestTypeIds: number[]): Promise<Request | null>
        findAllRequests(filters: GetAllRequestsInput, requestTypeIds: number[]): Promise<RequestSummary[]>

        createRequest(data: RequestLoanInput, requestTypeId: number, lapseId: number): Promise<Request>
        acceptRequest(data: AcceptRequestLoanInput, acceptedTypeId: number): Promise<Request | null>
        rejectRequest(data: RejectRequestLoanInput, rejectedTypeId: number): Promise<Request | null>

        findLoanById(movementId: number, loanTypeId: number): Promise<LoanEntity | null>
        findAllLoans(filters: GetAllLoansInput, loanTypeId: number): Promise<LoanSummary[]>
        findLoanDetails(movementId: number): Promise<LoanDetailLine[]>

        findInventoryById(inventoryId: number): Promise<InventoryStockRow | null>
        decreaseInventoryStock(inventoryId: number, amount: number): Promise<boolean>
        insertMovementDetail(movementId: number, detail: RegisterLoanDetailInput): Promise<LoanDetailLine | null>
        markMovementAsLoan(data: RegisterLoanInput, loanTypeId: number): Promise<LoanEntity | null>
        registerLoanAtomic(
            data: RegisterLoanInput,
            loanTypeId: number
        ): Promise<{ movement: LoanEntity; details: LoanDetailLine[] }>
    }

    export interface Service {
        getRequest(params: GetRequestInput): Promise<RequestDetail>
        getAllRequests(params: GetAllRequestsInput): Promise<RequestSummary[]>
        requestLoan(params: RequestLoanInput): Promise<Request>
        acceptRequestLoan(params: AcceptRequestLoanInput): Promise<Request>
        rejectRequestLoan(params: RejectRequestLoanInput): Promise<Request>

        getLoan(params: GetLoanInput): Promise<LoanDetail>
        getAllLoans(params: GetAllLoansInput): Promise<LoanSummary[]>
        registerLoan(params: RegisterLoanInput): Promise<LoanDetail>
    }
}

export type Request = Loan.Request
export type RequestSummary = Loan.RequestSummary
export type Loan = Loan.LoanEntity
export type LoanSummary = Loan.LoanSummary
export type LoanDetailLine = Loan.LoanDetailLine
export type TraceEntry = Loan.TraceEntry
export type RequestDetail = Loan.RequestDetail
export type LoanDetail = Loan.LoanDetail
export type InventoryStockRow = Loan.InventoryStockRow

export type GetRequestInput = Loan.GetRequestInput
export type GetAllRequestsInput = Loan.GetAllRequestsInput
export type RequestLoanInput = Loan.RequestLoanInput
export type AcceptRequestLoanInput = Loan.AcceptRequestLoanInput
export type RejectRequestLoanInput = Loan.RejectRequestLoanInput
export type RegisterLoanDetailInput = Loan.RegisterLoanDetailInput
export type RegisterLoanInput = Loan.RegisterLoanInput
export type GetLoanInput = Loan.GetLoanInput
export type GetAllLoansInput = Loan.GetAllLoansInput

export type RowCountLoan = Loan.RowCount
export type ExistsLoan = Loan.Exists
export type ILoanRepository = Loan.Repository
export type ILoanService = Loan.Service
