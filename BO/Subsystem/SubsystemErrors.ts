/**
 * Clases de Error Personalizadas para Subsystem Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { SubsystemMessages } from './SubsystemModule.js'

const defaultMessages = SubsystemMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Subsystem
 * Extiende BOError con código y status HTTP
 */
export class SubsystemError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'SubsystemError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Subsystem no se encuentra
 */
export class SubsystemNotFoundError extends SubsystemError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'SUBSYSTEM_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'SubsystemNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Subsystem duplicado
 */
export class SubsystemAlreadyExistsError extends SubsystemError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'SUBSYSTEM_ALREADY_EXISTS', 409, { field, value })
        this.name = 'SubsystemAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Subsystem
 */
export class SubsystemValidationError extends SubsystemError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'SUBSYSTEM_VALIDATION_ERROR', 400, { errors })
        this.name = 'SubsystemValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Subsystem no puede ser eliminado (ej: tiene dependencias)
 */
export class SubsystemCannotDeleteError extends SubsystemError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'SUBSYSTEM_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'SubsystemCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Subsystem
 */
export class SubsystemPermissionError extends SubsystemError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'SUBSYSTEM_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'SubsystemPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a SubsystemError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleSubsystemError(error)
 * }
 */
export function handleSubsystemError(error: unknown): SubsystemError {
    // Ya es un SubsystemError, retornar tal cual
    if (error instanceof SubsystemError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new SubsystemError(
            defaultMessages.invalidData,
            'SUBSYSTEM_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new SubsystemError(
        defaultMessages.invalidData,
        'SUBSYSTEM_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es SubsystemError
 */
export function isSubsystemError(error: unknown): error is SubsystemError {
    return error instanceof SubsystemError
}

/**
 * Type guard para errores de no encontrado
 */
export function isSubsystemNotFound(error: unknown): error is SubsystemNotFoundError {
    return error instanceof SubsystemNotFoundError
}
