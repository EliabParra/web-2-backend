/**
 * Fixtures centralizados para pruebas del módulo Auth.
 *
 * Provee datos de prueba realistas y reutilizables,
 * eliminando "magic strings" dispersas en los tests.
 *
 * @module test/__fixtures__/auth.fixtures
 */

import { createHash, randomBytes } from 'node:crypto'

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Hash bcrypt pre-computado de la contraseña 'Test1234' (4 rounds) */
export const HASHED_PASSWORD = '$2a$04$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012'

/** Token aleatorio para pruebas (64 hex chars) */
export const VALID_TOKEN = 'a'.repeat(64)

/** Hash SHA-256 de `VALID_TOKEN` */
export const VALID_TOKEN_HASH = createHash('sha256').update(VALID_TOKEN, 'utf8').digest('hex')

/** Token inválido para pruebas negativas */
export const INVALID_TOKEN = 'invalid-token-value'

/** Propósito estándar para verificación de email */
export const EMAIL_VERIFICATION_PURPOSE = 'email_verification'

// ─── Usuarios ────────────────────────────────────────────────────────────────

/**
 * Fila de usuario válida como la retorna la base de datos.
 *
 * Representa un usuario activo con email verificado.
 */
export const VALID_USER_ROW = {
    user_id: 1,
    username: 'testuser',
    user_email: 'test@example.com',
    user_password: HASHED_PASSWORD,
    user_email_verified_at: new Date('2025-01-01T00:00:00Z'),
    user_is_active: true,
    profile_id: 1,
    user_created_at: new Date('2025-01-01T00:00:00Z'),
    user_updated_at: new Date('2025-01-01T00:00:00Z'),
    user_last_login_at: null,
    user_solvent: false,
    person_id: null,
} as const

/**
 * Fila de usuario sin email verificado.
 */
export const UNVERIFIED_USER_ROW = {
    ...VALID_USER_ROW,
    user_id: 2,
    username: 'unverified',
    user_email: 'unverified@example.com',
    user_email_verified_at: null,
} as const

// ─── Inputs ──────────────────────────────────────────────────────────────────

/**
 * Input de registro válido para `AuthBO.register`.
 */
export const VALID_REGISTER_INPUT = {
    email: 'newuser@example.com',
    password: 'SecurePass123',
    name: 'New User',
} as const

/**
 * Input de verificación de email válido.
 */
export const VALID_VERIFY_EMAIL_INPUT = {
    token: VALID_TOKEN,
} as const

/**
 * Input de solicitud de reset de contraseña.
 */
export const VALID_REQUEST_PASSWORD_RESET_INPUT = {
    email: 'test@example.com',
} as const

/**
 * Input de confirmación de reset de contraseña.
 */
export const VALID_RESET_PASSWORD_INPUT = {
    token: VALID_TOKEN,
    newPassword: 'NewSecurePass456',
} as const

/**
 * Input de solicitud de username.
 */
export const VALID_REQUEST_USERNAME_INPUT = {
    email: 'test@example.com',
} as const

// ─── Password Reset ─────────────────────────────────────────────────────────

/**
 * Fila de password reset activa (no usada, no expirada).
 */
export const VALID_PASSWORD_RESET_ROW = {
    id: 1,
    user_id: 1,
    expires_at: new Date(Date.now() + 900_000),
    used_at: null,
    attempt_count: 0,
} as const

/**
 * Fila de password reset ya utilizada.
 */
export const USED_PASSWORD_RESET_ROW = {
    ...VALID_PASSWORD_RESET_ROW,
    id: 2,
    used_at: new Date('2025-06-01T00:00:00Z'),
} as const

// ─── One-Time Codes ──────────────────────────────────────────────────────────

/**
 * Fila de código OTP activo para verificación de email.
 */
export const VALID_OTP_ROW = {
    id: 1,
    user_id: 1,
    purpose: EMAIL_VERIFICATION_PURPOSE,
    expires_at: new Date(Date.now() + 900_000),
    consumed_at: null,
    attempt_count: 0,
    meta: { tokenHash: VALID_TOKEN_HASH },
} as const

// ─── Insert Results ──────────────────────────────────────────────────────────

/**
 * Resultado de `insertUser` — ID del usuario creado.
 */
export const INSERT_USER_RESULT = {
    user_id: 10,
} as const
