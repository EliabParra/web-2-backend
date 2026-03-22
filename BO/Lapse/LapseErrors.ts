/**
 * Clases de Error Personalizadas para Lapse Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { LapseMessages } from './LapseModule.js'

const defaultMessages = LapseMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Lapse
 * Extiende BOError con código y status HTTP
 */
export class LapseError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'LapseError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Lapse no se encuentra
 */
export class LapseNotFoundError extends LapseError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'LAPSE_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'LapseNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Lapse duplicado
 */
export class LapseAlreadyExistsError extends LapseError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'LAPSE_ALREADY_EXISTS', 409, { field, value })
        this.name = 'LapseAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Lapse
 */
export class LapseValidationError extends LapseError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'LAPSE_VALIDATION_ERROR', 400, { errors })
        this.name = 'LapseValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Lapse no puede ser eliminado (ej: tiene dependencias)
 */
export class LapseCannotDeleteError extends LapseError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'LAPSE_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'LapseCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Lapse
 */
export class LapsePermissionError extends LapseError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'LAPSE_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'LapsePermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a LapseError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleLapseError(error)
 * }
 */
export function handleLapseError(error: unknown): LapseError {
    // Ya es un LapseError, retornar tal cual
    if (error instanceof LapseError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new LapseError(
            defaultMessages.invalidData,
            'LAPSE_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new LapseError(
        defaultMessages.invalidData,
        'LAPSE_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es LapseError
 */
export function isLapseError(error: unknown): error is LapseError {
    return error instanceof LapseError
}

/**
 * Type guard para errores de no encontrado
 */
export function isLapseNotFound(error: unknown): error is LapseNotFoundError {
    return error instanceof LapseNotFoundError
}
