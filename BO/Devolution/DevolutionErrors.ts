/**
 * Clases de Error Personalizadas para Devolution Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { DevolutionMessages } from './DevolutionModule.js'

const defaultMessages = DevolutionMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Devolution
 * Extiende BOError con código y status HTTP
 */
export class DevolutionError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'DevolutionError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Devolution no se encuentra
 */
export class DevolutionNotFoundError extends DevolutionError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'DEVOLUTION_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'DevolutionNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Devolution duplicado
 */
export class DevolutionAlreadyExistsError extends DevolutionError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'DEVOLUTION_ALREADY_EXISTS', 409, { field, value })
        this.name = 'DevolutionAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Devolution
 */
export class DevolutionValidationError extends DevolutionError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'DEVOLUTION_VALIDATION_ERROR', 400, { errors })
        this.name = 'DevolutionValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Devolution no puede ser eliminado (ej: tiene dependencias)
 */
export class DevolutionCannotDeleteError extends DevolutionError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'DEVOLUTION_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'DevolutionCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Devolution
 */
export class DevolutionPermissionError extends DevolutionError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'DEVOLUTION_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'DevolutionPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a DevolutionError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleDevolutionError(error)
 * }
 */
export function handleDevolutionError(error: unknown): DevolutionError {
    // Ya es un DevolutionError, retornar tal cual
    if (error instanceof DevolutionError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new DevolutionError(
            defaultMessages.invalidData,
            'DEVOLUTION_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new DevolutionError(
        defaultMessages.invalidData,
        'DEVOLUTION_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es DevolutionError
 */
export function isDevolutionError(error: unknown): error is DevolutionError {
    return error instanceof DevolutionError
}

/**
 * Type guard para errores de no encontrado
 */
export function isDevolutionNotFound(error: unknown): error is DevolutionNotFoundError {
    return error instanceof DevolutionNotFoundError
}
