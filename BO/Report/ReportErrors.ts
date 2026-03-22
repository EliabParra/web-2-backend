/**
 * Clases de Error Personalizadas para Report Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { ReportMessages } from './ReportModule.js'

const defaultMessages = ReportMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Report
 * Extiende BOError con código y status HTTP
 */
export class ReportError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'ReportError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Report no se encuentra
 */
export class ReportNotFoundError extends ReportError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'REPORT_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'ReportNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Report duplicado
 */
export class ReportAlreadyExistsError extends ReportError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'REPORT_ALREADY_EXISTS', 409, { field, value })
        this.name = 'ReportAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Report
 */
export class ReportValidationError extends ReportError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'REPORT_VALIDATION_ERROR', 400, { errors })
        this.name = 'ReportValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Report no puede ser eliminado (ej: tiene dependencias)
 */
export class ReportCannotDeleteError extends ReportError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'REPORT_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'ReportCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Report
 */
export class ReportPermissionError extends ReportError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'REPORT_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'ReportPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a ReportError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleReportError(error)
 * }
 */
export function handleReportError(error: unknown): ReportError {
    // Ya es un ReportError, retornar tal cual
    if (error instanceof ReportError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new ReportError(
            defaultMessages.invalidData,
            'REPORT_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new ReportError(
        defaultMessages.invalidData,
        'REPORT_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es ReportError
 */
export function isReportError(error: unknown): error is ReportError {
    return error instanceof ReportError
}

/**
 * Type guard para errores de no encontrado
 */
export function isReportNotFound(error: unknown): error is ReportNotFoundError {
    return error instanceof ReportNotFoundError
}
