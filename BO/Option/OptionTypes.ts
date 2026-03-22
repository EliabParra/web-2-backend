/**
 * Definiciones de tipos para Option
 * Entidad:
 * option_id: identificador
 * option_na: nombre
 * method_id: método asociado
 */

export namespace Option {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        option_id: number
        option_na: string
        method_id?: number | null
    }

    export type Summary = {
        option_id: number
        option_na: string
        method_id?: number | null
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        option_na: string
        method_id?: number | null
    }

    export interface UpdateInput {
        option_id: number
        option_na?: string
        method_id?: number | null
    }

    export interface GetInput {
        option_id: number
    }

    export interface GetAllInput {
        option_na?: string
        method_id?: number | null
    }

    export interface DeleteInput {
        option_id: number
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

export type Option = Option.Entity
export type OptionSummary = Option.Summary
export type CreateOptionInput = Option.CreateInput
export type UpdateOptionInput = Option.UpdateInput
export type GetOptionInput = Option.GetInput
export type GetAllOptionInput = Option.GetAllInput
export type DeleteOptionInput = Option.DeleteInput

export type RowCountOption = Option.RowCount
export type ExistsOption = Option.Exists
export type IOptionRepository = Option.Repository
export type IOptionService = Option.Service
