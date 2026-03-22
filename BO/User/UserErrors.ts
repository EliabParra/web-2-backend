/**
 * Clases de Error Personalizadas para User Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { UserMessages } from './UserModule.js'

const defaultMessages = UserMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio User
 * Extiende BOError con código y status HTTP
 */
export class UserError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'UserError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad User no se encuentra
 */
export class UserNotFoundError extends UserError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'USER_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'UserNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un User duplicado
 */
export class UserAlreadyExistsError extends UserError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'USER_ALREADY_EXISTS', 409, { field, value })
        this.name = 'UserAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de User
 */
export class UserValidationError extends UserError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'USER_VALIDATION_ERROR', 400, { errors })
        this.name = 'UserValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando User no puede ser eliminado (ej: tiene dependencias)
 */
export class UserCannotDeleteError extends UserError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'USER_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'UserCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de User
 */
export class UserPermissionError extends UserError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'USER_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'UserPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a UserError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleUserError(error)
 * }
 */
export function handleUserError(error: unknown): UserError {
    // Ya es un UserError, retornar tal cual
    if (error instanceof UserError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new UserError(
            defaultMessages.invalidData,
            'USER_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new UserError(
        defaultMessages.invalidData,
        'USER_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es UserError
 */
export function isUserError(error: unknown): error is UserError {
    return error instanceof UserError
}

/**
 * Type guard para errores de no encontrado
 */
export function isUserNotFound(error: unknown): error is UserNotFoundError {
    return error instanceof UserNotFoundError
}
