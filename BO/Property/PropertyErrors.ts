/**
 * Clases de Error Personalizadas para Property Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { PropertyMessages } from './PropertyModule.js'

const defaultMessages = PropertyMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Property
 * Extiende BOError con código y status HTTP
 */
export class PropertyError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'PropertyError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Property no se encuentra
 */
export class PropertyNotFoundError extends PropertyError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'PROPERTY_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'PropertyNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Property duplicado
 */
export class PropertyAlreadyExistsError extends PropertyError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'PROPERTY_ALREADY_EXISTS', 409, { field, value })
        this.name = 'PropertyAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Property
 */
export class PropertyValidationError extends PropertyError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'PROPERTY_VALIDATION_ERROR', 400, { errors })
        this.name = 'PropertyValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Property no puede ser eliminado (ej: tiene dependencias)
 */
export class PropertyCannotDeleteError extends PropertyError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'PROPERTY_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'PropertyCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Property
 */
export class PropertyPermissionError extends PropertyError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'PROPERTY_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'PropertyPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a PropertyError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handlePropertyError(error)
 * }
 */
export function handlePropertyError(error: unknown): PropertyError {
    // Ya es un PropertyError, retornar tal cual
    if (error instanceof PropertyError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new PropertyError(
            defaultMessages.invalidData,
            'PROPERTY_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new PropertyError(
        defaultMessages.invalidData,
        'PROPERTY_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es PropertyError
 */
export function isPropertyError(error: unknown): error is PropertyError {
    return error instanceof PropertyError
}

/**
 * Type guard para errores de no encontrado
 */
export function isPropertyNotFound(error: unknown): error is PropertyNotFoundError {
    return error instanceof PropertyNotFoundError
}
