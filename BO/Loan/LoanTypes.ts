/**
 * Definiciones de tipos para Loan
 */

export namespace Loan {
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

export type Loan = Loan.Entity
export type LoanSummary = Loan.Summary
export type CreateLoanInput = Loan.CreateInput
export type UpdateLoanInput = Loan.UpdateInput
export type GetLoanInput = Loan.GetInput
export type GetAllLoanInput = Loan.GetAllInput
export type DeleteLoanInput = Loan.DeleteInput

export type RowCountLoan = Loan.RowCount
export type ExistsLoan = Loan.Exists
export type ILoanRepository = Loan.Repository
export type ILoanService = Loan.Service
