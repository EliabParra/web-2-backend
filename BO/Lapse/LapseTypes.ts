/**
 * Definiciones de tipos para Lapse
 * Entidad:
 * lapse_id: identificador
 * lapse_de: descripcion
 * lapse_act: activo
 * lapse_start_dt: fecha inicio
 * lapse_close_dt: fecha cierre
 */

export namespace Lapse {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        lapse_id: number
        lapse_de: string
        lapse_act?: boolean | null
        lapse_start_dt?: string | Date | null
        lapse_close_dt?: string | Date | null
    }

    export type Summary = {
        lapse_id: number
        lapse_de: string
        lapse_act?: boolean | null
        lapse_start_dt?: string | Date | null
        lapse_close_dt?: string | Date | null
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        lapse_de: string
        lapse_act?: boolean | null
        lapse_start_dt?: string | Date | null
        lapse_close_dt?: string | Date | null
    }

    export interface UpdateInput {
        lapse_id: number
        lapse_de?: string
        lapse_act?: boolean | null
        lapse_start_dt?: string | Date | null
        lapse_close_dt?: string | Date | null
    }

    export interface GetInput {
        lapse_id: number
    }

    export interface GetAllInput {
        lapse_de?: string
        lapse_act?: boolean | null
        lapse_start_dt?: string | Date | null
        lapse_close_dt?: string | Date | null
    }

    export interface DeleteInput {
        lapse_id: number
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

export type Lapse = Lapse.Entity
export type LapseSummary = Lapse.Summary
export type CreateLapseInput = Lapse.CreateInput
export type UpdateLapseInput = Lapse.UpdateInput
export type GetLapseInput = Lapse.GetInput
export type GetAllLapseInput = Lapse.GetAllInput
export type DeleteLapseInput = Lapse.DeleteInput

export type RowCountLapse = Lapse.RowCount
export type ExistsLapse = Lapse.Exists
export type ILapseRepository = Lapse.Repository
export type ILapseService = Lapse.Service
