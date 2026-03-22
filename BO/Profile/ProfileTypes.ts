/**
 * Definiciones de tipos para Profile
 * Entidad:
 * profile_id: identificador
 * profile_na: nombre
 */

export namespace Profile {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        profile_id: number
        profile_na: string
    }

    export type Summary = {
        profile_id: number
        profile_na: string
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        profile_na: string
    }

    export interface UpdateInput {
        profile_id: number
        profile_na?: string
    }

    export interface GetInput {
        profile_id: number
    }

    export interface GetAllInput {
        profile_na?: string
    }

    export interface DeleteInput {
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
        findAll(): Promise<Summary[]>
        findById(id: number): Promise<Entity | null>
        create(data: Partial<Entity>): Promise<Entity | null>
        update(id: number, data: Partial<Entity>): Promise<Entity | null>
        delete(id: number): Promise<boolean>
        exists(id: number): Promise<boolean>
    }

    export interface Service {
        getAll(): Promise<Summary[]>
        getById(id: number): Promise<Entity>
        create(data: Partial<Entity>): Promise<Entity | null>
        update(id: number, data: Partial<Entity>): Promise<Entity>
        delete(id: number): Promise<void>
    }
}

export type Profile = Profile.Entity
export type ProfileSummary = Profile.Summary
export type CreateProfileInput = Profile.CreateInput
export type UpdateProfileInput = Profile.UpdateInput
export type GetProfileInput = Profile.GetInput
export type GetAllProfileInput = Profile.GetAllInput
export type DeleteProfileInput = Profile.DeleteInput

export type RowCountProfile = Profile.RowCount
export type ExistsProfile = Profile.Exists
export type IProfileRepository = Profile.Repository
export type IProfileService = Profile.Service
