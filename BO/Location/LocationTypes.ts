/**
 * Definiciones de tipos para Location
 * Entidad:
 * id: identificador
 * de: descripcion
 * sh: estante
 * dr: gaveta
 */

export namespace Location {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        location_id: number
        location_de: string
        location_sh: number
        location_dr: number
    }

    export type Summary = {
        id: number
        shelf: number
        drawer: number
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        description: string
        shelf: number
        drawer: number
    }

    export interface UpdateInput {
        id: number
        description?: string
        shelf?: number
        drawer?: number
    }

    export interface GetInput {
        id: number
    }

    export interface GetAllInput {
        description?: string
        shelf?: number
        drawer?: number
    }

    export interface DeleteInput {
        id: number
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

export type Location = Location.Entity
export type LocationSummary = Location.Summary
export type CreateLocationInput = Location.CreateInput
export type UpdateLocationInput = Location.UpdateInput
export type GetLocationInput = Location.GetInput
export type GetAllLocationInput = Location.GetAllInput
export type DeleteLocationInput = Location.DeleteInput

export type RowCountLocation = Location.RowCount
export type ExistsLocation = Location.Exists
export type ILocationRepository = Location.Repository
export type ILocationService = Location.Service
