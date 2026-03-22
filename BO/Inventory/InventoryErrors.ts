/**
 * Clases de Error Personalizadas para Inventory Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError } from '@toproc/bo'
import type { TxKey } from '@toproc/types'
import { InventoryMessages } from './InventoryModule.js'

const defaultMessages = InventoryMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Inventory
 * Extiende BOError con código y status HTTP
 */
export class InventoryError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'InventoryError';
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Inventory no se encuentra
 */
export class InventoryNotFoundError extends InventoryError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'INVENTORY_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'InventoryNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Inventory duplicado
 */
export class InventoryAlreadyExistsError extends InventoryError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'INVENTORY_ALREADY_EXISTS', 409, { field, value })
        this.name = 'InventoryAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Inventory
 */
export class InventoryValidationError extends InventoryError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'INVENTORY_VALIDATION_ERROR', 400, { errors })
        this.name = 'InventoryValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Inventory no puede ser eliminado (ej: tiene dependencias)
 */
export class InventoryCannotDeleteError extends InventoryError {
    constructor(reason?: string) {
        super(
            defaultMessages.cannotDelete,
            'INVENTORY_CANNOT_DELETE',
            409,
            { reason }
        )
        this.name = 'InventoryCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Inventory
 */
export class InventoryPermissionError extends InventoryError {
    constructor(action?: string) {
        super(
            defaultMessages.permissionDenied,
            'INVENTORY_PERMISSION_DENIED',
            403,
            { action }
        )
        this.name = 'InventoryPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a InventoryError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleInventoryError(error)
 * }
 */
export function handleInventoryError(error: unknown): InventoryError {
    // Ya es un InventoryError, retornar tal cual
    if (error instanceof InventoryError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new InventoryError(
            defaultMessages.invalidData,
            'INVENTORY_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new InventoryError(
        defaultMessages.invalidData,
        'INVENTORY_UNKNOWN_ERROR',
        500
    )
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es InventoryError
 */
export function isInventoryError(error: unknown): error is InventoryError {
    return error instanceof InventoryError
}

/**
 * Type guard para errores de no encontrado
 */
export function isInventoryNotFound(error: unknown): error is InventoryNotFoundError {
    return error instanceof InventoryNotFoundError
}
