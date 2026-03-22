/**
 * Clases de Error Personalizadas para Profile Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { ProfileMessages } from './ProfileModule.js'

const defaultMessages = ProfileMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Profile
 * Extiende BOError con código y status HTTP
 */
export class ProfileError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'ProfileError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Profile no se encuentra
 */
export class ProfileNotFoundError extends ProfileError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'PROFILE_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'ProfileNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Profile duplicado
 */
export class ProfileAlreadyExistsError extends ProfileError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'PROFILE_ALREADY_EXISTS', 409, { field, value })
        this.name = 'ProfileAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Profile
 */
export class ProfileValidationError extends ProfileError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'PROFILE_VALIDATION_ERROR', 400, { errors })
        this.name = 'ProfileValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Profile no puede ser eliminado (ej: tiene dependencias)
 */
export class ProfileCannotDeleteError extends ProfileError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'PROFILE_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'ProfileCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Profile
 */
export class ProfilePermissionError extends ProfileError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'PROFILE_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'ProfilePermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a ProfileError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleProfileError(error)
 * }
 */
export function handleProfileError(error: unknown): ProfileError {
    // Ya es un ProfileError, retornar tal cual
    if (error instanceof ProfileError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new ProfileError(
            defaultMessages.invalidData,
            'PROFILE_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new ProfileError(
        defaultMessages.invalidData,
        'PROFILE_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es ProfileError
 */
export function isProfileError(error: unknown): error is ProfileError {
    return error instanceof ProfileError
}

/**
 * Type guard para errores de no encontrado
 */
export function isProfileNotFound(error: unknown): error is ProfileNotFoundError {
    return error instanceof ProfileNotFoundError
}
