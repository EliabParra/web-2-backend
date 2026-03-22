/**
 * Definiciones de tipos para Category
 * Entidad:
 * category_id: identificador
 * category_de: descripcion
 * category_type_id: tipo de categoria
 */

export namespace Category {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        category_id: number
        category_de: string
        category_type_id: number
    }

    export type Summary = {
        category_id: number
        category_de: string
        category_type_id: number
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        category_de: string
        category_type_id: number
    }

    export interface UpdateInput {
        category_id: number
        category_de?: string
        category_type_id?: number
    }

    export interface GetInput {
        category_id: number
    }

    export interface GetAllInput {
        category_de?: string
        category_type_id?: number
    }

    export interface DeleteInput {
        category_id: number
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

export type Category = Category.Entity
export type CategorySummary = Category.Summary
export type CreateCategoryInput = Category.CreateInput
export type UpdateCategoryInput = Category.UpdateInput
export type GetCategoryInput = Category.GetInput
export type GetAllCategoryInput = Category.GetAllInput
export type DeleteCategoryInput = Category.DeleteInput

export type RowCountCategory = Category.RowCount
export type ExistsCategory = Category.Exists
export type ICategoryRepository = Category.Repository
export type ICategoryService = Category.Service
