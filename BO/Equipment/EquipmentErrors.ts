/**
 * Clases de Error Personalizadas para Equipment Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { EquipmentMessages } from './EquipmentModule.js'

const defaultMessages = EquipmentMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Equipment
 * Extiende BOError con código y status HTTP
 */
export class EquipmentError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'EquipmentError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Equipment no se encuentra
 */
export class EquipmentNotFoundError extends EquipmentError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'EQUIPMENT_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'EquipmentNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Equipment duplicado
 */
export class EquipmentAlreadyExistsError extends EquipmentError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'EQUIPMENT_ALREADY_EXISTS', 409, { field, value })
        this.name = 'EquipmentAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Equipment
 */
export class EquipmentValidationError extends EquipmentError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'EQUIPMENT_VALIDATION_ERROR', 400, { errors })
        this.name = 'EquipmentValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Equipment no puede ser eliminado (ej: tiene dependencias)
 */
export class EquipmentCannotDeleteError extends EquipmentError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'EQUIPMENT_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'EquipmentCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Equipment
 */
export class EquipmentPermissionError extends EquipmentError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'EQUIPMENT_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'EquipmentPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a EquipmentError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleEquipmentError(error)
 * }
 */
export function handleEquipmentError(error: unknown): EquipmentError {
    // Ya es un EquipmentError, retornar tal cual
    if (error instanceof EquipmentError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new EquipmentError(
            defaultMessages.invalidData,
            'EQUIPMENT_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new EquipmentError(
        defaultMessages.invalidData,
        'EQUIPMENT_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es EquipmentError
 */
export function isEquipmentError(error: unknown): error is EquipmentError {
    return error instanceof EquipmentError
}

/**
 * Type guard para errores de no encontrado
 */
export function isEquipmentNotFound(error: unknown): error is EquipmentNotFoundError {
    return error instanceof EquipmentNotFoundError
}
