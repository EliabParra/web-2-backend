/**
 * Clases de Error Personalizadas para Loan Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { LoanMessages } from './LoanModule.js'

const defaultMessages = LoanMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Loan
 * Extiende BOError con código y status HTTP
 */
export class LoanError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'LoanError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Loan no se encuentra
 */
export class LoanNotFoundError extends LoanError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'LOAN_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'LoanNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Loan duplicado
 */
export class LoanAlreadyExistsError extends LoanError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'LOAN_ALREADY_EXISTS', 409, { field, value })
        this.name = 'LoanAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Loan
 */
export class LoanValidationError extends LoanError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(errors[0] ?? defaultMessages.invalidData, 'LOAN_VALIDATION_ERROR', 400, { errors })
        this.name = 'LoanValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Loan no puede ser eliminado (ej: tiene dependencias)
 */
export class LoanCannotDeleteError extends LoanError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'LOAN_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'LoanCannotDeleteError'
    }
}

export class LoanInvalidStateError extends LoanError {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            message ?? defaultMessages.requestNotPending,
            'LOAN_INVALID_STATE',
            409,
            details
        )
        this.name = 'LoanInvalidStateError'
    }
}

export class LoanStockInsufficientError extends LoanError {
    constructor(details?: Record<string, unknown>) {
        super(defaultMessages.stockInsufficient, 'LOAN_STOCK_INSUFFICIENT', 409, details)
        this.name = 'LoanStockInsufficientError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Loan
 */
export class LoanPermissionError extends LoanError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'LOAN_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'LoanPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a LoanError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleLoanError(error)
 * }
 */
export function handleLoanError(error: unknown): LoanError {
    // Ya es un LoanError, retornar tal cual
    if (error instanceof LoanError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new LoanError(
            defaultMessages.invalidData,
            'LOAN_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new LoanError(
        defaultMessages.invalidData,
        'LOAN_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es LoanError
 */
export function isLoanError(error: unknown): error is LoanError {
    return error instanceof LoanError
}

/**
 * Type guard para errores de no encontrado
 */
export function isLoanNotFound(error: unknown): error is LoanNotFoundError {
    return error instanceof LoanNotFoundError
}
