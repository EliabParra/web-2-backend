/**
 * Clases de Error Personalizadas para Component Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { ComponentMessages } from './ComponentModule.js'

const defaultMessages = ComponentMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Component
 * Extiende BOError con código y status HTTP
 */
export class ComponentError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'ComponentError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Component no se encuentra
 */
export class ComponentNotFoundError extends ComponentError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'COMPONENT_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'ComponentNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Component duplicado
 */
export class ComponentAlreadyExistsError extends ComponentError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'COMPONENT_ALREADY_EXISTS', 409, { field, value })
        this.name = 'ComponentAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Component
 */
export class ComponentValidationError extends ComponentError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'COMPONENT_VALIDATION_ERROR', 400, { errors })
        this.name = 'ComponentValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Component no puede ser eliminado (ej: tiene dependencias)
 */
export class ComponentCannotDeleteError extends ComponentError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'COMPONENT_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'ComponentCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Component
 */
export class ComponentPermissionError extends ComponentError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'COMPONENT_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'ComponentPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a ComponentError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleComponentError(error)
 * }
 */
export function handleComponentError(error: unknown): ComponentError {
    // Ya es un ComponentError, retornar tal cual
    if (error instanceof ComponentError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new ComponentError(
            defaultMessages.invalidData,
            'COMPONENT_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new ComponentError(
        defaultMessages.invalidData,
        'COMPONENT_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es ComponentError
 */
export function isComponentError(error: unknown): error is ComponentError {
    return error instanceof ComponentError
}

/**
 * Type guard para errores de no encontrado
 */
export function isComponentNotFound(error: unknown): error is ComponentNotFoundError {
    return error instanceof ComponentNotFoundError
}
