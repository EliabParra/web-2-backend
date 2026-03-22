/**
 * Definiciones de tipos para Property
 * Entidad:
 * property_id: identificador
 * property_de: descripcion
 * property_val: valor
 */

export namespace Property {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        property_id: number
        property_de: string
        property_val: number
    }

    export type Summary = {
        property_id: number
        property_de: string
        property_val: number
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        property_de: string
        property_val: number
    }

    export interface UpdateInput {
        property_id: number
        property_de?: string
        property_val?: number
    }

    export interface GetInput {
        property_id: number
    }

    export interface GetAllInput {
        property_de?: string
        property_val?: number
    }

    export interface DeleteInput {
        property_id: number
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

export type Property = Property.Entity
export type PropertySummary = Property.Summary
export type CreatePropertyInput = Property.CreateInput
export type UpdatePropertyInput = Property.UpdateInput
export type GetPropertyInput = Property.GetInput
export type GetAllPropertyInput = Property.GetAllInput
export type DeletePropertyInput = Property.DeleteInput

export type RowCountProperty = Property.RowCount
export type ExistsProperty = Property.Exists
export type IPropertyRepository = Property.Repository
export type IPropertyService = Property.Service
