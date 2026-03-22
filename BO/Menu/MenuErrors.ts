/**
 * Clases de Error Personalizadas para Menu Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { MenuMessages } from './MenuModule.js'

const defaultMessages = MenuMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Menu
 * Extiende BOError con código y status HTTP
 */
export class MenuError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'MenuError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Menu no se encuentra
 */
export class MenuNotFoundError extends MenuError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'MENU_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'MenuNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Menu duplicado
 */
export class MenuAlreadyExistsError extends MenuError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'MENU_ALREADY_EXISTS', 409, { field, value })
        this.name = 'MenuAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Menu
 */
export class MenuValidationError extends MenuError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'MENU_VALIDATION_ERROR', 400, { errors })
        this.name = 'MenuValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Menu no puede ser eliminado (ej: tiene dependencias)
 */
export class MenuCannotDeleteError extends MenuError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'MENU_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'MenuCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Menu
 */
export class MenuPermissionError extends MenuError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'MENU_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'MenuPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a MenuError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleMenuError(error)
 * }
 */
export function handleMenuError(error: unknown): MenuError {
    // Ya es un MenuError, retornar tal cual
    if (error instanceof MenuError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new MenuError(
            defaultMessages.invalidData,
            'MENU_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new MenuError(
        defaultMessages.invalidData,
        'MENU_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es MenuError
 */
export function isMenuError(error: unknown): error is MenuError {
    return error instanceof MenuError
}

/**
 * Type guard para errores de no encontrado
 */
export function isMenuNotFound(error: unknown): error is MenuNotFoundError {
    return error instanceof MenuNotFoundError
}
