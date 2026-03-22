/**
 * Definiciones de tipos para Subsystem
 * Entidad:
 * subsystem_id: identificador
 * subsystem_na: nombre
 */

export namespace Subsystem {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        subsystem_id: number
        subsystem_na: string
    }

    export type Summary = {
        subsystem_id: number
        subsystem_na: string
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        subsystem_na: string
    }

    export interface UpdateInput {
        subsystem_id: number
        subsystem_na?: string
    }

    export interface GetInput {
        subsystem_id: number
    }

    export interface GetAllInput {
        subsystem_na?: string
    }

    export interface DeleteInput {
        subsystem_id: number
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

export type Subsystem = Subsystem.Entity
export type SubsystemSummary = Subsystem.Summary
export type CreateSubsystemInput = Subsystem.CreateInput
export type UpdateSubsystemInput = Subsystem.UpdateInput
export type GetSubsystemInput = Subsystem.GetInput
export type GetAllSubsystemInput = Subsystem.GetAllInput
export type DeleteSubsystemInput = Subsystem.DeleteInput

export type RowCountSubsystem = Subsystem.RowCount
export type ExistsSubsystem = Subsystem.Exists
export type ISubsystemRepository = Subsystem.Repository
export type ISubsystemService = Subsystem.Service
