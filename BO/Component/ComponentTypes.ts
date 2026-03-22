/**
 * Definiciones de tipos para Component
 * Entidad base: business.item
 * item_id: identificador
 * item_cod: codigo
 * item_na: nombre
 * category_id: categoria
 */

export namespace Component {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        item_id: number
        item_cod: number
        item_na: string
        category_id: number
    }

    export type Summary = {
        item_id: number
        item_cod: number
        item_na: string
        category_id: number
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        item_cod: number
        item_na: string
        category_id: number
    }

    export interface UpdateInput {
        item_id: number
        item_cod?: number
        item_na?: string
        category_id?: number
    }

    export interface GetInput {
        item_id: number
    }

    export interface GetAllInput {
        item_cod?: number
        item_na?: string
        category_id?: number
    }

    export interface DeleteInput {
        item_id: number
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

export type Component = Component.Entity
export type ComponentSummary = Component.Summary
export type CreateComponentInput = Component.CreateInput
export type UpdateComponentInput = Component.UpdateInput
export type GetComponentInput = Component.GetInput
export type GetAllComponentInput = Component.GetAllInput
export type DeleteComponentInput = Component.DeleteInput

export type RowCountComponent = Component.RowCount
export type ExistsComponent = Component.Exists
export type IComponentRepository = Component.Repository
export type IComponentService = Component.Service
