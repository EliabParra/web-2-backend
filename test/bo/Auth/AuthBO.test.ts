/**
 * Pruebas unitarias para AuthBO.
 *
 * Suite 100% aislada: mockea `AuthService` como dependencia inyectada
 * para validar la orquestación de cada método del BO.
 *
 * @module test/bo/Auth/AuthBO.test
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { AuthBO } from '../../../BO/Auth/AuthBO.js'
import { AuthService } from '../../../BO/Auth/AuthService.js'
import { AuthTokenInvalidError, AuthEmailExistsError } from '../../../BO/Auth/AuthErrors.js'
import { createTestContainer, createMockFn, type MockFn } from '../../_helpers/test-utils.js'
import {
    VALID_REGISTER_INPUT,
    VALID_VERIFY_EMAIL_INPUT,
    VALID_REQUEST_PASSWORD_RESET_INPUT,
    VALID_RESET_PASSWORD_INPUT,
    VALID_REQUEST_USERNAME_INPUT,
    VALID_USER_ROW,
} from '../../__fixtures__/auth.fixtures.js'
import type { IContainer } from '../../../src/types/core.js'

// ─── Tipos internos ──────────────────────────────────────────────────────────

/** Mock parcial de AuthService con las funciones rastreables */
interface MockAuthService {
    register: MockFn
    verifyEmail: MockFn
    requestEmailVerification: MockFn
    requestPasswordReset: MockFn
    verifyPasswordResetToken: MockFn
    resetPassword: MockFn
    requestUsername: MockFn
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Crea un AuthBO con un AuthService completamente mockeado.
 *
 * @returns Tupla [instancia del BO, mock del servicio]
 */
function createAuthBOWithMocks(): { bo: AuthBO; service: MockAuthService } {
    const service: MockAuthService = {
        register: createMockFn(async () => VALID_USER_ROW),
        verifyEmail: createMockFn(async () => {}),
        requestEmailVerification: createMockFn(async () => {}),
        requestPasswordReset: createMockFn(async () => {}),
        verifyPasswordResetToken: createMockFn(async () => {}),
        resetPassword: createMockFn(async () => {}),
        requestUsername: createMockFn(async () => {}),
    }

    const container: IContainer = createTestContainer({
        AuthService: service,
        AuthRepository: {},
    })

    const bo = new AuthBO(container)
    return { bo, service }
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AuthBO', () => {
    let bo: AuthBO
    let service: MockAuthService

    beforeEach(() => {
        const mocks = createAuthBOWithMocks()
        bo = mocks.bo
        service = mocks.service
    })

    // ── register ─────────────────────────────────────────────────────────

    describe('register', () => {
        it('should return 201 when registration data is valid', async () => {
            // Arrange
            const params = { ...VALID_REGISTER_INPUT }

            // Act
            const result = await bo.register(params)

            // Assert
            assert.equal(result.code, 201)
            assert.equal(service.register.callCount, 1)
        })

        it('should return error when AuthService throws AuthEmailExistsError', async () => {
            // Arrange
            service.register = createMockFn(async () => {
                throw new AuthEmailExistsError()
            })
            const container = createTestContainer({
                AuthService: service,
                AuthRepository: {},
            })
            const errorBo = new AuthBO(container)

            // Act
            const result = await errorBo.register({ ...VALID_REGISTER_INPUT })

            // Assert
            assert.equal(result.code, 409)
        })

        it('should return 400 when email is invalid', async () => {
            // Arrange
            const params = { email: 'not-an-email', password: 'SecurePass123' }

            // Act
            const result = await bo.register(params as Parameters<typeof bo.register>[0])

            // Assert
            assert.equal(result.code, 400)
            assert.equal(service.register.callCount, 0)
        })

        it('should return 400 when password is too short', async () => {
            // Arrange
            const params = { email: 'valid@email.com', password: 'short' }

            // Act
            const result = await bo.register(params as Parameters<typeof bo.register>[0])

            // Assert
            assert.equal(result.code, 400)
            assert.equal(service.register.callCount, 0)
        })
    })

    // ── verifyEmail ──────────────────────────────────────────────────────

    describe('verifyEmail', () => {
        it('should return 200 when token is valid', async () => {
            // Arrange
            const params = { ...VALID_VERIFY_EMAIL_INPUT }

            // Act
            const result = await bo.verifyEmail(params)

            // Assert
            assert.equal(result.code, 200)
            assert.equal(service.verifyEmail.callCount, 1)
        })

        it('should return error when AuthService throws AuthTokenInvalidError', async () => {
            // Arrange
            service.verifyEmail = createMockFn(async () => {
                throw new AuthTokenInvalidError()
            })
            const container = createTestContainer({
                AuthService: service,
                AuthRepository: {},
            })
            const errorBo = new AuthBO(container)

            // Act
            const result = await errorBo.verifyEmail({ ...VALID_VERIFY_EMAIL_INPUT })

            // Assert
            assert.equal(result.code, 400)
        })

        it('should return 400 when token is empty', async () => {
            // Arrange
            const params = { token: '' }

            // Act
            const result = await bo.verifyEmail(params)

            // Assert
            assert.equal(result.code, 400)
            assert.equal(service.verifyEmail.callCount, 0)
        })
    })

    // ── requestEmailVerification ────────────────────────────────────────

    describe('requestEmailVerification', () => {
        it('should return 200 when identifier is provided', async () => {
            // Arrange
            const params = { identifier: 'test@example.com' }

            // Act
            const result = await bo.requestEmailVerification(params)

            // Assert
            assert.equal(result.code, 200)
            assert.equal(service.requestEmailVerification.callCount, 1)
        })

        it('should return 400 when identifier is empty', async () => {
            // Arrange
            const params = { identifier: '' }

            // Act
            const result = await bo.requestEmailVerification(params)

            // Assert
            assert.equal(result.code, 400)
            assert.equal(service.requestEmailVerification.callCount, 0)
        })
    })

    // ── requestPasswordReset ─────────────────────────────────────────────

    describe('requestPasswordReset', () => {
        it('should return 200 when email is valid', async () => {
            // Arrange
            const params = { ...VALID_REQUEST_PASSWORD_RESET_INPUT }

            // Act
            const result = await bo.requestPasswordReset(params)

            // Assert
            assert.equal(result.code, 200)
            assert.equal(service.requestPasswordReset.callCount, 1)
        })

        it('should return 400 when email is invalid', async () => {
            // Arrange
            const params = { email: 'not-valid' }

            // Act
            const result = await bo.requestPasswordReset(params as Parameters<typeof bo.requestPasswordReset>[0])

            // Assert
            assert.equal(result.code, 400)
            assert.equal(service.requestPasswordReset.callCount, 0)
        })
    })

    // ── verifyPasswordReset ──────────────────────────────────────────────

    describe('verifyPasswordReset', () => {
        it('should return 200 when token is valid', async () => {
            // Arrange
            const params = { ...VALID_VERIFY_EMAIL_INPUT }

            // Act
            const result = await bo.verifyPasswordReset(params)

            // Assert
            assert.equal(result.code, 200)
            assert.equal(service.verifyPasswordResetToken.callCount, 1)
        })

        it('should return error when token is invalid', async () => {
            // Arrange
            service.verifyPasswordResetToken = createMockFn(async () => {
                throw new AuthTokenInvalidError()
            })
            const container = createTestContainer({
                AuthService: service,
                AuthRepository: {},
            })
            const errorBo = new AuthBO(container)

            // Act
            const result = await errorBo.verifyPasswordReset({ ...VALID_VERIFY_EMAIL_INPUT })

            // Assert
            assert.equal(result.code, 400)
        })
    })

    // ── resetPassword ────────────────────────────────────────────────────

    describe('resetPassword', () => {
        it('should return 200 when token and new password are valid', async () => {
            // Arrange
            const params = { ...VALID_RESET_PASSWORD_INPUT }

            // Act
            const result = await bo.resetPassword(params)

            // Assert
            assert.equal(result.code, 200)
            assert.equal(service.resetPassword.callCount, 1)
        })

        it('should return error when AuthService throws AuthTokenInvalidError', async () => {
            // Arrange
            service.resetPassword = createMockFn(async () => {
                throw new AuthTokenInvalidError()
            })
            const container = createTestContainer({
                AuthService: service,
                AuthRepository: {},
            })
            const errorBo = new AuthBO(container)

            // Act
            const result = await errorBo.resetPassword({ ...VALID_RESET_PASSWORD_INPUT })

            // Assert
            assert.equal(result.code, 400)
        })

        it('should return 400 when new password is too short', async () => {
            // Arrange
            const params = { token: VALID_RESET_PASSWORD_INPUT.token, newPassword: 'short' }

            // Act
            const result = await bo.resetPassword(params as Parameters<typeof bo.resetPassword>[0])

            // Assert
            assert.equal(result.code, 400)
            assert.equal(service.resetPassword.callCount, 0)
        })
    })

    // ── requestUsername ───────────────────────────────────────────────────

    describe('requestUsername', () => {
        it('should return 200 when email is valid', async () => {
            // Arrange
            const params = { ...VALID_REQUEST_USERNAME_INPUT }

            // Act
            const result = await bo.requestUsername(params)

            // Assert
            assert.equal(result.code, 200)
            assert.equal(service.requestUsername.callCount, 1)
        })

        it('should return 400 when email is invalid', async () => {
            // Arrange
            const params = { email: 'not-valid' }

            // Act
            const result = await bo.requestUsername(params as Parameters<typeof bo.requestUsername>[0])

            // Assert
            assert.equal(result.code, 400)
            assert.equal(service.requestUsername.callCount, 0)
        })
    })
})
