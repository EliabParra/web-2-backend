/**
 * Definiciones de tipos para Method
 * Entidad:
 * method_id: identificador
 * method_na: nombre
 */

export namespace Method {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        method_id: number
        method_na: string
    }

    export type Summary = {
        method_id: number
        method_na: string
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        method_na: string
    }

    export interface UpdateInput {
        method_id: number
        method_na?: string
    }

    export interface GetInput {
        method_id: number
    }

    export interface GetAllInput {
        method_na?: string
    }

    export interface DeleteInput {
        method_id: number
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

export type Method = Method.Entity
export type MethodSummary = Method.Summary
export type CreateMethodInput = Method.CreateInput
export type UpdateMethodInput = Method.UpdateInput
export type GetMethodInput = Method.GetInput
export type GetAllMethodInput = Method.GetAllInput
export type DeleteMethodInput = Method.DeleteInput

export type RowCountMethod = Method.RowCount
export type ExistsMethod = Method.Exists
export type IMethodRepository = Method.Repository
export type IMethodService = Method.Service
