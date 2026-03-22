/**
 * Clases de Error Personalizadas para Method Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { MethodMessages } from './MethodModule.js'

const defaultMessages = MethodMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Method
 * Extiende BOError con código y status HTTP
 */
export class MethodError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'MethodError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Method no se encuentra
 */
export class MethodNotFoundError extends MethodError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'METHOD_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'MethodNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Method duplicado
 */
export class MethodAlreadyExistsError extends MethodError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'METHOD_ALREADY_EXISTS', 409, { field, value })
        this.name = 'MethodAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Method
 */
export class MethodValidationError extends MethodError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'METHOD_VALIDATION_ERROR', 400, { errors })
        this.name = 'MethodValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Method no puede ser eliminado (ej: tiene dependencias)
 */
export class MethodCannotDeleteError extends MethodError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'METHOD_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'MethodCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Method
 */
export class MethodPermissionError extends MethodError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'METHOD_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'MethodPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a MethodError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleMethodError(error)
 * }
 */
export function handleMethodError(error: unknown): MethodError {
    // Ya es un MethodError, retornar tal cual
    if (error instanceof MethodError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new MethodError(
            defaultMessages.invalidData,
            'METHOD_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new MethodError(
        defaultMessages.invalidData,
        'METHOD_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es MethodError
 */
export function isMethodError(error: unknown): error is MethodError {
    return error instanceof MethodError
}

/**
 * Type guard para errores de no encontrado
 */
export function isMethodNotFound(error: unknown): error is MethodNotFoundError {
    return error instanceof MethodNotFoundError
}
