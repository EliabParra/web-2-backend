/**
 * Clases de Error Personalizadas para Option Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { OptionMessages } from './OptionModule.js'

const defaultMessages = OptionMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Option
 * Extiende BOError con código y status HTTP
 */
export class OptionError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'OptionError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Option no se encuentra
 */
export class OptionNotFoundError extends OptionError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'OPTION_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'OptionNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Option duplicado
 */
export class OptionAlreadyExistsError extends OptionError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'OPTION_ALREADY_EXISTS', 409, { field, value })
        this.name = 'OptionAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Option
 */
export class OptionValidationError extends OptionError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'OPTION_VALIDATION_ERROR', 400, { errors })
        this.name = 'OptionValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Option no puede ser eliminado (ej: tiene dependencias)
 */
export class OptionCannotDeleteError extends OptionError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'OPTION_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'OptionCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Option
 */
export class OptionPermissionError extends OptionError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'OPTION_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'OptionPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a OptionError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleOptionError(error)
 * }
 */
export function handleOptionError(error: unknown): OptionError {
    // Ya es un OptionError, retornar tal cual
    if (error instanceof OptionError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new OptionError(
            defaultMessages.invalidData,
            'OPTION_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new OptionError(
        defaultMessages.invalidData,
        'OPTION_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es OptionError
 */
export function isOptionError(error: unknown): error is OptionError {
    return error instanceof OptionError
}

/**
 * Type guard para errores de no encontrado
 */
export function isOptionNotFound(error: unknown): error is OptionNotFoundError {
    return error instanceof OptionNotFoundError
}
