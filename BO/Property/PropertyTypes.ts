/**
 * Definiciones de tipos para Property
 */

export namespace Property {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        // TODO: Definir propiedades de la entidad
        id: number
        createdAt: Date
        updatedAt?: Date
    }

    export type Summary = {
        // TODO: Definir propiedades para listados/resúmenes
        id: number
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        // TODO: Definir datos para creación
    }

    export interface UpdateInput {
        // TODO: Definir datos para actualización
    }

    export interface GetInput {
        // TODO: Definir datos para get
    }

    export interface GetAllInput {
        // TODO: Definir datos para getAll
    }

    export interface DeleteInput {
        // TODO: Definir datos para delete
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
