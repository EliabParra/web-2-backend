/**
 * Tipos HTTP y Extensiones de Express
 *
 * Augmentaciones de tipos para Express y express-session.
 *
 * @module types/http
 */
import { Request, Response } from 'express'
import 'express-session'

export interface AppSessionData {
    userId?: number
    username?: string
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    profileIds?: number[]
    activeProfileId?: number
    email?: string
    csrfToken?: string
    [key: string]: unknown
}

// Augmentación de express-session
declare module 'express-session' {
    interface SessionData extends AppSessionData {}
}

/**
 * Request de Express con extensiones de la aplicación.
 */
export interface AppRequest extends Request {
    /** UUID único de la petición */
    requestId?: string
    /** Timestamp de inicio de la petición */
    requestStartMs?: number
}

/**
 * Response de Express.
 */
export type AppResponse = Response

/**
 * Body de petición /login.
 */
export interface LoginRequestBody {
    loginId: string
    password: string
}

/**
 * Body de petición /toProccess.
 */
export interface ToProccessRequestBody {
    /** ID de la transacción */
    tx: number
    /** Parámetros de la transacción */
    params?: Record<string, unknown> | string | number
}

/**
 * Usuario de sesión activa.
 */
export interface SessionUser {
    userId: number
    username: string
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    profileIds: number[]
    profileName: string
    email: string
}
