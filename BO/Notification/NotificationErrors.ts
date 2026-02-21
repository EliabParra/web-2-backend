/**
 * Clases de Error Personalizadas para Notification Business Object
 *
 * Usa errores específicos del dominio en lugar de genéricos para:
 * - Mejor manejo y recuperación de errores
 * - Respuestas de API más claras
 * - Depuración más fácil
 */

import { BOError, TxKey } from '../../src/core/business-objects/index.js'
import { NotificationMessages } from './NotificationModule.js'

const defaultMessages = NotificationMessages.es

// ============================================================
// Clase Base de Error
// ============================================================

/**
 * Clase base de error para el dominio Notification
 * Extiende BOError con código y status HTTP
 */
export class NotificationError extends BOError {
    constructor(
        message: TxKey | (string & {}),
        tag: string,
        code: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message, tag, code, details)
        this.name = 'NotificationError'
    }
}

// ============================================================
// Clases de Error Específicas
// ============================================================

/**
 * Lanzado cuando la entidad Notification no se encuentra
 */
export class NotificationNotFoundError extends NotificationError {
    constructor(id?: number) {
        super(defaultMessages.notFound, 'NOTIFICATION_NOT_FOUND', 404, id ? { id } : undefined)
        this.name = 'NotificationNotFoundError'
    }
}

/**
 * Lanzado cuando se detecta un Notification duplicado
 */
export class NotificationAlreadyExistsError extends NotificationError {
    constructor(field?: string, value?: string) {
        super(defaultMessages.alreadyExists, 'NOTIFICATION_ALREADY_EXISTS', 409, { field, value })
        this.name = 'NotificationAlreadyExistsError'
    }
}

/**
 * Lanzado cuando falla la validación de datos de Notification
 */
export class NotificationValidationError extends NotificationError {
    readonly validationErrors: string[]

    constructor(errors: string[]) {
        super(defaultMessages.invalidData, 'NOTIFICATION_VALIDATION_ERROR', 400, { errors })
        this.name = 'NotificationValidationError'
        this.validationErrors = errors
    }
}

/**
 * Lanzado cuando Notification no puede ser eliminado (ej: tiene dependencias)
 */
export class NotificationCannotDeleteError extends NotificationError {
    constructor(reason?: string) {
        super(defaultMessages.cannotDelete, 'NOTIFICATION_CANNOT_DELETE', 409, { reason })
        this.name = 'NotificationCannotDeleteError'
    }
}

/**
 * Lanzado cuando el usuario no tiene permiso para la operación de Notification
 */
export class NotificationPermissionError extends NotificationError {
    constructor(action?: string) {
        super(defaultMessages.permissionDenied, 'NOTIFICATION_PERMISSION_DENIED', 403, { action })
        this.name = 'NotificationPermissionError'
    }
}

// ============================================================
// Utilidad de Manejo de Errores
// ============================================================

/**
 * Convierte errores desconocidos a NotificationError
 * Usar en bloques catch para manejo de errores consistente
 *
 * @example
 * try {
 *     await this.service.create(data)
 * } catch (error) {
 *     throw handleNotificationError(error)
 * }
 */
export function handleNotificationError(error: unknown): NotificationError {
    // Ya es un NotificationError, retornar tal cual
    if (error instanceof NotificationError) {
        return error
    }

    // Error estándar, envolverlo
    if (error instanceof Error) {
        return new NotificationError(
            defaultMessages.invalidData,
            'NOTIFICATION_UNKNOWN_ERROR',
            500,
            { originalError: error.name, message: error.message }
        )
    }

    // Tipo desconocido, crear error genérico
    return new NotificationError(defaultMessages.invalidData, 'NOTIFICATION_UNKNOWN_ERROR', 500)
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard para verificar si un error es NotificationError
 */
export function isNotificationError(error: unknown): error is NotificationError {
    return error instanceof NotificationError
}

/**
 * Type guard para errores de no encontrado
 */
export function isNotificationNotFound(error: unknown): error is NotificationNotFoundError {
    return error instanceof NotificationNotFoundError
}
