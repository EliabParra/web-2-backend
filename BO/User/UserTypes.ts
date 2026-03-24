/**
 * Definiciones de tipos para User
 */

export namespace User {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        user_id: number
        user_na: string
        user_pw: string
        user_act: boolean
        profile_ids?: number[]
        user_created_dt?: string | Date
        user_updated_dt?: string | Date
        user_last_login_dt?: string | Date | null
        user_em?: string | null
        user_em_verified_dt?: string | Date | null
        user_sol?: boolean | null
        person_id?: number | null
        person_ci?: string | null
        person_na?: string | null
        person_ln?: string | null
        person_ph?: string | null
        person_deg?: string | null
    }

    export type Summary = {
        user_id: number
        user_na: string
        user_act: boolean
        profile_ids?: number[]
        user_created_dt?: string | Date
        user_updated_dt?: string | Date
        user_last_login_dt?: string | Date | null
        user_em?: string | null
        user_em_verified_dt?: string | Date | null
        user_sol?: boolean | null
        person_id?: number | null
        person_ci?: string | null
        person_na?: string | null
        person_ln?: string | null
        person_ph?: string | null
        person_deg?: string | null
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        user_na: string
        user_pw: string
        user_act?: boolean
        user_em?: string | null
        user_em_verified_dt?: string | Date | null
        user_sol?: boolean | null
        person_ci?: string | null
        person_na?: string | null
        person_ln?: string | null
        person_ph?: string | null
        person_deg?: string | null
    }

    export interface UpdateInput {
        user_id: number
        user_na?: string
        user_pw?: string
        user_act?: boolean
        user_em?: string | null
        user_em_verified_dt?: string | Date | null
        user_sol?: boolean | null
        person_ci?: string | null
        person_na?: string | null
        person_ln?: string | null
        person_ph?: string | null
        person_deg?: string | null
    }

    export interface GetInput {
        user_id: number
    }

    export interface GetAllInput {
        user_na?: string
        user_em?: string
        user_act?: boolean
        person_na?: string
    }

    export interface DeleteInput {
        user_id: number
    }

    export interface ProfileAssignmentInput {
        user_id: number
        profile_id: number
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
        create(data: Partial<Entity>): Promise<Entity | null>
        update(id: number, data: Partial<Entity>): Promise<Entity | null>
        delete(id: number): Promise<boolean>
        exists(id: number): Promise<boolean>
        assignProfile(userId: number, profileId: number): Promise<boolean>
        revokeProfile(userId: number, profileId: number): Promise<boolean>
    }

    export interface Service {
        getAll(filters?: GetAllInput): Promise<Summary[]>
        getById(id: number): Promise<Entity>
        create(data: Partial<Entity>): Promise<Entity | null>
        update(id: number, data: Partial<Entity>): Promise<Entity>
        delete(id: number): Promise<void>
        assignProfile(data: ProfileAssignmentInput): Promise<boolean>
        revokeProfile(data: ProfileAssignmentInput): Promise<boolean>
    }
}

export type User = User.Entity
export type UserSummary = User.Summary
export type CreateUserInput = User.CreateInput
export type UpdateUserInput = User.UpdateInput
export type GetUserInput = User.GetInput
export type GetAllUserInput = User.GetAllInput
export type DeleteUserInput = User.DeleteInput

export type RowCountUser = User.RowCount
export type ExistsUser = User.Exists
export type IUserRepository = User.Repository
export type IUserService = User.Service
