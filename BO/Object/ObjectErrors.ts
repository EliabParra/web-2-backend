/**
 * Clases de Error Personalizadas para Object Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { ObjectMessages } from './ObjectModule.js'

const defaultMessages = ObjectMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Object
 * Extiende BOError con código y status HTTP
 */
export class ObjectError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'ObjectError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Object no se encuentra
 */
export class ObjectNotFoundError extends ObjectError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'OBJECT_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'ObjectNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Object duplicado
 */
export class ObjectAlreadyExistsError extends ObjectError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'OBJECT_ALREADY_EXISTS', 409, { field, value })
        this.name = 'ObjectAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Object
 */
export class ObjectValidationError extends ObjectError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'OBJECT_VALIDATION_ERROR', 400, { errors })
        this.name = 'ObjectValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Object no puede ser eliminado (ej: tiene dependencias)
 */
export class ObjectCannotDeleteError extends ObjectError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'OBJECT_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'ObjectCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Object
 */
export class ObjectPermissionError extends ObjectError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'OBJECT_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'ObjectPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a ObjectError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleObjectError(error)
 * }
 */
export function handleObjectError(error: unknown): ObjectError {
    // Ya es un ObjectError, retornar tal cual
    if (error instanceof ObjectError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new ObjectError(
            defaultMessages.invalidData,
            'OBJECT_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new ObjectError(
        defaultMessages.invalidData,
        'OBJECT_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es ObjectError
 */
export function isObjectError(error: unknown): error is ObjectError {
    return error instanceof ObjectError
}

/**
 * Type guard para errores de no encontrado
 */
export function isObjectNotFound(error: unknown): error is ObjectNotFoundError {
    return error instanceof ObjectNotFoundError
}
