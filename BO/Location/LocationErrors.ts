/**
 * Clases de Error Personalizadas para Location Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { LocationMessages } from './LocationModule.js'

const defaultMessages = LocationMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Location
 * Extiende BOError con código y status HTTP
 */
export class LocationError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'LocationError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Location no se encuentra
 */
export class LocationNotFoundError extends LocationError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'LOCATION_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'LocationNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Location duplicado
 */
export class LocationAlreadyExistsError extends LocationError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'LOCATION_ALREADY_EXISTS', 409, { field, value })
        this.name = 'LocationAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Location
 */
export class LocationValidationError extends LocationError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'LOCATION_VALIDATION_ERROR', 400, { errors })
        this.name = 'LocationValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Location no puede ser eliminado (ej: tiene dependencias)
 */
export class LocationCannotDeleteError extends LocationError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'LOCATION_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'LocationCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Location
 */
export class LocationPermissionError extends LocationError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'LOCATION_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'LocationPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a LocationError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleLocationError(error)
 * }
 */
export function handleLocationError(error: unknown): LocationError {
    // Ya es un LocationError, retornar tal cual
    if (error instanceof LocationError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new LocationError(
            defaultMessages.invalidData,
            'LOCATION_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new LocationError(
        defaultMessages.invalidData,
        'LOCATION_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es LocationError
 */
export function isLocationError(error: unknown): error is LocationError {
    return error instanceof LocationError
}

/**
 * Type guard para errores de no encontrado
 */
export function isLocationNotFound(error: unknown): error is LocationNotFoundError {
    return error instanceof LocationNotFoundError
}
