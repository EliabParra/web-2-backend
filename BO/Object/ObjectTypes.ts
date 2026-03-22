/**
 * Definiciones de tipos para Object
 * Entidad:
 * object_id: identificador
 * object_na: nombre
 */

export namespace Object {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        object_id: number
        object_na: string
    }

    export type Summary = {
        object_id: number
        object_na: string
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        object_na: string
    }

    export interface UpdateInput {
        object_id: number
        object_na?: string
    }

    export interface GetInput {
        object_id: number
    }

    export interface GetAllInput {
        object_na?: string
    }

    export interface DeleteInput {
        object_id: number
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

export type Object = Object.Entity
export type ObjectSummary = Object.Summary
export type CreateObjectInput = Object.CreateInput
export type UpdateObjectInput = Object.UpdateInput
export type GetObjectInput = Object.GetInput
export type GetAllObjectInput = Object.GetAllInput
export type DeleteObjectInput = Object.DeleteInput

export type RowCountObject = Object.RowCount
export type ExistsObject = Object.Exists
export type IObjectRepository = Object.Repository
export type IObjectService = Object.Service
