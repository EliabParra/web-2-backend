/**
 * Clases de Error Personalizadas para Group Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { GroupMessages } from './GroupModule.js'

const defaultMessages = GroupMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Group
 * Extiende BOError con código y status HTTP
 */
export class GroupError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'GroupError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Group no se encuentra
 */
export class GroupNotFoundError extends GroupError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'GROUP_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'GroupNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Group duplicado
 */
export class GroupAlreadyExistsError extends GroupError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'GROUP_ALREADY_EXISTS', 409, { field, value })
        this.name = 'GroupAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Group
 */
export class GroupValidationError extends GroupError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'GROUP_VALIDATION_ERROR', 400, { errors })
        this.name = 'GroupValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Group no puede ser eliminado (ej: tiene dependencias)
 */
export class GroupCannotDeleteError extends GroupError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'GROUP_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'GroupCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Group
 */
export class GroupPermissionError extends GroupError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'GROUP_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'GroupPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a GroupError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleGroupError(error)
 * }
 */
export function handleGroupError(error: unknown): GroupError {
    // Ya es un GroupError, retornar tal cual
    if (error instanceof GroupError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new GroupError(
            defaultMessages.invalidData,
            'GROUP_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new GroupError(
        defaultMessages.invalidData,
        'GROUP_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es GroupError
 */
export function isGroupError(error: unknown): error is GroupError {
    return error instanceof GroupError
}

/**
 * Type guard para errores de no encontrado
 */
export function isGroupNotFound(error: unknown): error is GroupNotFoundError {
    return error instanceof GroupNotFoundError
}
