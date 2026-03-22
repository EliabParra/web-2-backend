/**
 * Clases de Error Personalizadas para Category Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { CategoryMessages } from './CategoryModule.js'

const defaultMessages = CategoryMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Category
 * Extiende BOError con código y status HTTP
 */
export class CategoryError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'CategoryError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Category no se encuentra
 */
export class CategoryNotFoundError extends CategoryError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'CATEGORY_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'CategoryNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Category duplicado
 */
export class CategoryAlreadyExistsError extends CategoryError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'CATEGORY_ALREADY_EXISTS', 409, { field, value })
        this.name = 'CategoryAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Category
 */
export class CategoryValidationError extends CategoryError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'CATEGORY_VALIDATION_ERROR', 400, { errors })
        this.name = 'CategoryValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Category no puede ser eliminado (ej: tiene dependencias)
 */
export class CategoryCannotDeleteError extends CategoryError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'CATEGORY_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'CategoryCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Category
 */
export class CategoryPermissionError extends CategoryError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'CATEGORY_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'CategoryPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a CategoryError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleCategoryError(error)
 * }
 */
export function handleCategoryError(error: unknown): CategoryError {
    // Ya es un CategoryError, retornar tal cual
    if (error instanceof CategoryError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new CategoryError(
            defaultMessages.invalidData,
            'CATEGORY_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new CategoryError(
        defaultMessages.invalidData,
        'CATEGORY_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es CategoryError
 */
export function isCategoryError(error: unknown): error is CategoryError {
    return error instanceof CategoryError
}

/**
 * Type guard para errores de no encontrado
 */
export function isCategoryNotFound(error: unknown): error is CategoryNotFoundError {
    return error instanceof CategoryNotFoundError
}
