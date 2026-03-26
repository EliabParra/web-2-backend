/**
 * Definiciones de tipos para Devolution
 */

export namespace Devolution {
    export type Detail = {
        movement_detail_id: number
        inventory_id: number
        movement_detail_am: number
        movement_detail_ob?: string | null
        returned_am: number
        pending_am: number
        devolution_status_de?: string | null
        devolution_status_dt?: string | Date | null
        devolution_status_ob?: string | null
    }

    export type Entity = {
        movement_id: number
        user_id: number
        movement_ob?: string | null
        movement_booking_dt?: string | Date | null
        movement_estimated_return_dt?: string | Date | null
        movement_type_id: number
        movement_type_de?: string | null
        lapse_id: number
        lapse_de?: string | null
        total_items: number
        returned_items: number
        pending_items: number
        damaged_items: number
        details: Detail[]
    }

    export type Summary = {
        movement_id: number
        user_id: number
        movement_booking_dt?: string | Date | null
        movement_estimated_return_dt?: string | Date | null
        movement_type_id: number
        movement_type_de?: string | null
        lapse_id: number
        lapse_de?: string | null
        total_items: number
        returned_items: number
        pending_items: number
        damaged_items: number
    }

    export interface RegisterDetailInput {
        movement_detail_id: number
        returned_am?: number
        condition?: 'good' | 'damaged' | 'partial'
        damage_ob?: string
    }

    export interface RegisterInput {
        movement_id: number
        devolution_ob?: string
        actor_user_id?: number
        details: RegisterDetailInput[]
    }

    export interface GetInput {
        id: number
    }

    export interface GetDevolutionInput {
        movement_id: number
    }

    export interface GetAllInput {
        user_id?: number
        lapse_id?: number
        from_dt?: string | Date
        to_dt?: string | Date
        status?: 'partial' | 'completed' | 'damaged'
    }

    export interface GetUserInput {
        user_id: number
        from_dt?: string | Date
        to_dt?: string | Date
        status?: 'partial' | 'completed' | 'damaged'
    }

    export interface UpdateInput {
        id: number
        movement_ob?: string
    }

    export interface DeleteInput {
        id: number
    }

    export type MovementDetailBase = {
        movement_detail_id: number
        movement_detail_am: number
        movement_detail_ob?: string | null
        inventory_id: number
        movement_id: number
    }

    export type MovementTypeCheck = {
        movement_type_id: number
    }

    export type RegisterResult = {
        movement_id: number
        allReturned: boolean
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
        findByMovementId(movementId: number): Promise<Entity | null>
        findByUserId(userId: number, filters?: Omit<GetUserInput, 'user_id'>): Promise<Summary[]>
        findMovementTypeByMovementId(movementId: number): Promise<number | null>
        findMovementDetailsByMovementId(movementId: number): Promise<MovementDetailBase[]>
        hasDevolutionByMovementId(movementId: number): Promise<boolean>
        registerAtomic(data: RegisterInput): Promise<RegisterResult>
    }

    export interface Service {
        getAll(filters?: GetAllInput): Promise<Summary[]>
        getById(id: number): Promise<Entity>
        getDevolution(params: GetDevolutionInput): Promise<Entity>
        getAllDevolutions(params: GetAllInput): Promise<Summary[]>
        getUserDevolution(params: GetUserInput): Promise<Summary[]>
        registerDevolution(params: RegisterInput): Promise<Entity>
        create(data: RegisterInput): Promise<Entity>
        update(id: number, data: UpdateInput): Promise<Entity>
        delete(id: number): Promise<void>
    }
}

export type Devolution = Devolution.Entity
export type DevolutionSummary = Devolution.Summary
export type DevolutionDetail = Devolution.Detail
export type RegisterDevolutionDetailInput = Devolution.RegisterDetailInput
export type RegisterDevolutionInput = Devolution.RegisterInput
export type CreateDevolutionInput = Devolution.RegisterInput
export type UpdateDevolutionInput = Devolution.UpdateInput
export type GetDevolutionInput = Devolution.GetInput
export type GetAllDevolutionInput = Devolution.GetAllInput
export type GetOneDevolutionInput = Devolution.GetDevolutionInput
export type GetUserDevolutionInput = Devolution.GetUserInput
export type DeleteDevolutionInput = Devolution.DeleteInput
export type MovementDetailBase = Devolution.MovementDetailBase
export type MovementTypeCheck = Devolution.MovementTypeCheck
export type RegisterDevolutionResult = Devolution.RegisterResult

export type RowCountDevolution = Devolution.RowCount
export type ExistsDevolution = Devolution.Exists
export type IDevolutionRepository = Devolution.Repository
export type IDevolutionService = Devolution.Service
