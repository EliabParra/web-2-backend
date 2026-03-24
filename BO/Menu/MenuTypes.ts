/**
 * Definiciones de tipos para Menu
 * Entidad:
 * menu_id: identificador
 * menu_na: nombre
 * subsystem_id: subsistema
 */

export namespace Menu {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        menu_id: number
        menu_na: string
        subsystem_id?: number | null
    }

    export type Summary = {
        menu_id: number
        menu_na: string
        subsystem_id?: number | null
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        menu_na: string
        subsystem_id?: number | null
    }

    export interface UpdateInput {
        menu_id: number
        menu_na?: string
        subsystem_id?: number | null
    }

    export interface GetInput {
        menu_id: number
    }

    export interface GetAllInput {
        menu_na?: string
        subsystem_id?: number | null
    }

    export interface DeleteInput {
        menu_id: number
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
    }

    export interface Service {
        getAll(filters?: GetAllInput): Promise<Summary[]>
        getById(id: number): Promise<Entity>
        create(data: Partial<Entity>): Promise<Entity | null>
        update(id: number, data: Partial<Entity>): Promise<Entity>
        delete(id: number): Promise<void>
    }
}

export type Menu = Menu.Entity
export type MenuSummary = Menu.Summary
export type CreateMenuInput = Menu.CreateInput
export type UpdateMenuInput = Menu.UpdateInput
export type GetMenuInput = Menu.GetInput
export type GetAllMenuInput = Menu.GetAllInput
export type DeleteMenuInput = Menu.DeleteInput

export type RowCountMenu = Menu.RowCount
export type ExistsMenu = Menu.Exists
export type IMenuRepository = Menu.Repository
export type IMenuService = Menu.Service
