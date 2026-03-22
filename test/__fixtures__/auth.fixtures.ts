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
    user_na: 'testuser',
    user_em: 'test@example.com',
    user_pw: HASHED_PASSWORD,
    user_em_verified_dt: new Date('2025-01-01T00:00:00Z'),
    user_act: true,
    profile_id: 1,
    user_created_dt: new Date('2025-01-01T00:00:00Z'),
    user_updated_dt: new Date('2025-01-01T00:00:00Z'),
    user_last_login_dt: null,
    user_sol: false,
    person_id: null,
} as const

/**
 * Fila de usuario sin email verificado.
 */
export const UNVERIFIED_USER_ROW = {
    ...VALID_USER_ROW,
    user_id: 2,
    user_na: 'unverified',
    user_em: 'unverified@example.com',
    user_em_verified_dt: null,
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
    code: '123456',
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
 * Input de solicitud de user_na.
 */
export const VALID_REQUEST_USERNAME_INPUT = {
    email: 'test@example.com',
} as const

// ─── Password Reset ─────────────────────────────────────────────────────────

/**
 * Fila de password reset activa (no usada, no expirada).
 */
// TODO(REVERT_NAMING): Revert password_reset_id→id, password_reset_expires_dt→expires_at, password_reset_used_dt→used_at, password_reset_ac→attempt_count
export const VALID_PASSWORD_RESET_ROW = {
    password_reset_id: 1,
    user_id: 1,
    password_reset_expires_dt: new Date(Date.now() + 900_000),
    password_reset_used_dt: null,
    password_reset_ac: 0,
} as const

/**
 * Fila de password reset ya utilizada.
 */
export const USED_PASSWORD_RESET_ROW = {
    ...VALID_PASSWORD_RESET_ROW,
    password_reset_id: 2,
    password_reset_used_dt: new Date('2025-06-01T00:00:00Z'),
} as const

// ─── One-Time Codes ──────────────────────────────────────────────────────────

/**
 * Fila de código OTP activo para verificación de email.
 */
// TODO(REVERT_NAMING): Revert one_time_code_id→id, one_time_code_pu→purpose, one_time_code_expires_dt→expires_at, one_time_code_consumed_dt→consumed_at, one_time_code_ac→attempt_count, one_time_code_meta→meta
export const VALID_OTP_ROW = {
    one_time_code_id: 1,
    user_id: 1,
    one_time_code_pu: EMAIL_VERIFICATION_PURPOSE,
    one_time_code_expires_dt: new Date(Date.now() + 900_000),
    one_time_code_consumed_dt: null,
    one_time_code_ac: 0,
    one_time_code_meta: { tokenHash: VALID_TOKEN_HASH },
} as const

// ─── Insert Results ──────────────────────────────────────────────────────────

/**
 * Resultado de `insertUserWithPerson` — ID del usuario creado.
 */
export const INSERT_USER_RESULT = {
    user_id: 10,
} as const
