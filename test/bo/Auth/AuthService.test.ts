/**
 * Pruebas unitarias para AuthService.
 *
 * Suite aislada que mockea `AuthRepository`, `IEmailService` e `II18nService`
 * para validar la lógica de negocio de autenticación sin I/O real.
 *
 * @module test/bo/Auth/AuthService.test
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { AuthService } from '../../../BO/Auth/AuthService.js'
import {
    AuthEmailExistsError,
    AuthTokenInvalidError,
} from '../../../BO/Auth/AuthErrors.js'
import { createTestContainer, createMockFn, mockEmail, type MockFn } from '../../_helpers/test-utils.js'
import {
    VALID_USER_ROW,
    UNVERIFIED_USER_ROW,
    VALID_OTP_ROW,
    VALID_PASSWORD_RESET_ROW,
    USED_PASSWORD_RESET_ROW,
    INSERT_USER_RESULT,
} from '../../__fixtures__/auth.fixtures.js'
import type { IContainer } from '../../../src/types/core.js'

// ─── Tipos internos ──────────────────────────────────────────────────────────

/** Mock parcial de AuthRepository con funciones rastreables */
interface MockAuthRepo {
    getUserByEmail: MockFn
    getUserByUsername: MockFn
    getUserBaseByEmail: MockFn
    insertUser: MockFn
    upsertUserProfile: MockFn
    setUserEmailVerified: MockFn
    insertPasswordReset: MockFn
    invalidateActivePasswordResetsForUser: MockFn
    getPasswordResetByTokenHash: MockFn
    markPasswordResetUsed: MockFn
    insertOneTimeCode: MockFn
    consumeOneTimeCode: MockFn
    getActiveOneTimeCodeForPurposeAndTokenHash: MockFn
    updateUserPassword: MockFn
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Crea una instancia de AuthService con un repo completamente mockeado.
 *
 * @returns Tupla con el servicio y el mock del repo
 */
function createAuthServiceWithMocks(): {
    service: AuthService
    repo: MockAuthRepo
    email: ReturnType<typeof mockEmail> & { sendTemplate: MockFn }
} {
    const repo: MockAuthRepo = {
        getUserByEmail: createMockFn(async () => null),
        getUserByUsername: createMockFn(async () => null),
        getUserBaseByEmail: createMockFn(async () => null),
        insertUser: createMockFn(async () => ({ ...INSERT_USER_RESULT })),
        upsertUserProfile: createMockFn(async () => true),
        setUserEmailVerified: createMockFn(async () => true),
        insertPasswordReset: createMockFn(async () => {}),
        invalidateActivePasswordResetsForUser: createMockFn(async () => true),
        getPasswordResetByTokenHash: createMockFn(async () => null),
        markPasswordResetUsed: createMockFn(async () => true),
        insertOneTimeCode: createMockFn(async () => true),
        consumeOneTimeCode: createMockFn(async () => true),
        getActiveOneTimeCodeForPurposeAndTokenHash: createMockFn(async () => null),
        updateUserPassword: createMockFn(async () => true),
    }

    const emailMock = {
        ...mockEmail(),
        sendTemplate: createMockFn(async () => ({ ok: true, mode: 'test' })),
    }

    const container: IContainer = createTestContainer({
        AuthRepository: repo,
        email: emailMock,
    })

    const service = new AuthService(container)

    return { service, repo, email: emailMock }
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
    let service: AuthService
    let repo: MockAuthRepo
    let email: ReturnType<typeof createAuthServiceWithMocks>['email']

    beforeEach(() => {
        const mocks = createAuthServiceWithMocks()
        service = mocks.service
        repo = mocks.repo
        email = mocks.email
    })

    // ── register ─────────────────────────────────────────────────────────

    describe('register', () => {
        it('should create user and send verification email when email does not exist', async () => {
            // Arrange
            repo.getUserBaseByEmail = createMockFn(async () => null)

            // Act
            const result = await service.register({
                email: 'new@example.com',
                password: 'SecurePass123',
                name: 'Test User',
            })

            // Assert
            assert.equal(result.user_id, INSERT_USER_RESULT.user_id)
            assert.equal(repo.insertUser.callCount, 1)
            assert.equal(repo.upsertUserProfile.callCount, 1)
            assert.equal(repo.insertOneTimeCode.callCount, 1)
            assert.equal(email.sendTemplate.callCount, 1)
        })

        it('should not send verification email when requireEmailVerification is false', async () => {
            // Arrange
            const repoLocal: MockAuthRepo = {
                ...repo,
                getUserBaseByEmail: createMockFn(async () => null),
                insertUser: createMockFn(async () => ({ ...INSERT_USER_RESULT })),
                upsertUserProfile: createMockFn(async () => true),
                insertOneTimeCode: createMockFn(async () => true),
            }
            const emailLocal = {
                ...mockEmail(),
                sendTemplate: createMockFn(async () => ({ ok: true, mode: 'test' })),
            }
            const container = createTestContainer({
                AuthRepository: repoLocal,
                email: emailLocal,
                config: {
                    app: { port: 3000, host: 'localhost', name: 'Test', lang: 'es', env: 'test', frontendMode: 'none' as const, frontendUrl: 'http://localhost' },
                    db: {},
                    session: { secret: 'test' },
                    cors: {},
                    log: { minLevel: 'error' as const },
                    auth: { sessionProfileId: 1, requireEmailVerification: false },
                    email: { provider: 'console' as const },
                    bo: { path: './BO' },
                    websocket: { adapter: 'memory' as const },
                },
            })
            const localService = new AuthService(container)

            // Act
            await localService.register({
                email: 'new@example.com',
                password: 'SecurePass123',
            })

            // Assert
            assert.equal(repoLocal.insertOneTimeCode.callCount, 0)
            assert.equal(emailLocal.sendTemplate.callCount, 0)
        })

        it('should throw AuthEmailExistsError when email already exists', async () => {
            // Arrange
            repo.getUserBaseByEmail = createMockFn(async () => ({ ...VALID_USER_ROW }))

            // Act & Assert
            await assert.rejects(
                () => service.register({ email: 'test@example.com', password: 'SecurePass123' }),
                (error: unknown) => {
                    assert.ok(error instanceof AuthEmailExistsError)
                    return true
                }
            )
        })
    })

    // ── verifyEmail ──────────────────────────────────────────────────────

    describe('verifyEmail', () => {
        it('should verify email and consume OTP when token is valid', async () => {
            // Arrange
            repo.getActiveOneTimeCodeForPurposeAndTokenHash = createMockFn(
                async () => ({ ...VALID_OTP_ROW })
            )

            // Act
            await service.verifyEmail('a'.repeat(64))

            // Assert
            assert.equal(repo.setUserEmailVerified.callCount, 1)
            assert.equal(repo.consumeOneTimeCode.callCount, 1)
        })

        it('should throw AuthTokenInvalidError when OTP is not found', async () => {
            // Arrange
            repo.getActiveOneTimeCodeForPurposeAndTokenHash = createMockFn(async () => null)

            // Act & Assert
            await assert.rejects(
                () => service.verifyEmail('invalid-token'),
                (error: unknown) => {
                    assert.ok(error instanceof AuthTokenInvalidError)
                    return true
                }
            )
        })
    })

    // ── requestEmailVerification ────────────────────────────────────────

    describe('requestEmailVerification', () => {
        it('should lookup by email and send verification when identifier contains @', async () => {
            // Arrange
            repo.getUserByEmail = createMockFn(async () => ({ ...VALID_USER_ROW }))

            // Act
            await service.requestEmailVerification('test@example.com')

            // Assert
            assert.equal(repo.getUserByEmail.callCount, 1)
            assert.equal(repo.getUserByUsername.callCount, 0)
            assert.equal(repo.insertOneTimeCode.callCount, 1)
            assert.equal(email.sendTemplate.callCount, 1)
        })

        it('should lookup by username when identifier does not contain @', async () => {
            // Arrange
            repo.getUserByUsername = createMockFn(async () => ({ ...VALID_USER_ROW }))

            // Act
            await service.requestEmailVerification('testuser')

            // Assert
            assert.equal(repo.getUserByUsername.callCount, 1)
            assert.equal(repo.getUserByEmail.callCount, 0)
        })

        it('should do nothing when user is not found', async () => {
            // Arrange — defaults return null

            // Act
            await service.requestEmailVerification('nonexistent@example.com')

            // Assert
            assert.equal(repo.insertOneTimeCode.callCount, 0)
            assert.equal(email.sendTemplate.callCount, 0)
        })
    })

    // ── requestPasswordReset ─────────────────────────────────────────────

    describe('requestPasswordReset', () => {
        it('should invalidate old resets and send email when user exists', async () => {
            // Arrange
            repo.getUserByEmail = createMockFn(async () => ({ ...VALID_USER_ROW }))

            // Act
            await service.requestPasswordReset('test@example.com')

            // Assert
            assert.equal(repo.invalidateActivePasswordResetsForUser.callCount, 1)
            assert.equal(repo.insertPasswordReset.callCount, 1)
            assert.equal(email.sendTemplate.callCount, 1)
        })

        it('should silently return when user does not exist', async () => {
            // Arrange
            repo.getUserByEmail = createMockFn(async () => null)

            // Act
            await service.requestPasswordReset('nonexistent@example.com')

            // Assert
            assert.equal(repo.invalidateActivePasswordResetsForUser.callCount, 0)
            assert.equal(repo.insertPasswordReset.callCount, 0)
            assert.equal(email.sendTemplate.callCount, 0)
        })
    })

    // ── resetPassword ────────────────────────────────────────────────────

    describe('resetPassword', () => {
        it('should update password and mark reset as used when token is valid', async () => {
            // Arrange
            repo.getPasswordResetByTokenHash = createMockFn(
                async () => ({ ...VALID_PASSWORD_RESET_ROW })
            )

            // Act
            await service.resetPassword('a'.repeat(64), 'NewPassword123')

            // Assert
            assert.equal(repo.updateUserPassword.callCount, 1)
            assert.equal(repo.markPasswordResetUsed.callCount, 1)
        })

        it('should throw AuthTokenInvalidError when reset token is not found', async () => {
            // Arrange
            repo.getPasswordResetByTokenHash = createMockFn(async () => null)

            // Act & Assert
            await assert.rejects(
                () => service.resetPassword('bad-token', 'NewPassword123'),
                (error: unknown) => {
                    assert.ok(error instanceof AuthTokenInvalidError)
                    return true
                }
            )
        })

        it('should throw AuthTokenInvalidError when reset token was already used', async () => {
            // Arrange
            repo.getPasswordResetByTokenHash = createMockFn(
                async () => ({ ...USED_PASSWORD_RESET_ROW })
            )

            // Act & Assert
            await assert.rejects(
                () => service.resetPassword('a'.repeat(64), 'NewPassword123'),
                (error: unknown) => {
                    assert.ok(error instanceof AuthTokenInvalidError)
                    return true
                }
            )
        })
    })

    // ── verifyPasswordResetToken ─────────────────────────────────────────

    describe('verifyPasswordResetToken', () => {
        it('should resolve when token is valid and not used', async () => {
            // Arrange
            repo.getPasswordResetByTokenHash = createMockFn(
                async () => ({ ...VALID_PASSWORD_RESET_ROW })
            )

            // Act & Assert — no throw
            await service.verifyPasswordResetToken('a'.repeat(64))
        })

        it('should throw AuthTokenInvalidError when token is not found', async () => {
            // Arrange
            repo.getPasswordResetByTokenHash = createMockFn(async () => null)

            // Act & Assert
            await assert.rejects(
                () => service.verifyPasswordResetToken('bad-token'),
                (error: unknown) => {
                    assert.ok(error instanceof AuthTokenInvalidError)
                    return true
                }
            )
        })
    })

    // ── requestUsername ───────────────────────────────────────────────────

    describe('requestUsername', () => {
        it('should send username recovery email when user exists', async () => {
            // Arrange
            repo.getUserBaseByEmail = createMockFn(async () => ({ ...VALID_USER_ROW }))

            // Act
            await service.requestUsername('test@example.com')

            // Assert
            assert.equal(email.sendTemplate.callCount, 1)
        })

        it('should silently return when user does not exist', async () => {
            // Arrange
            repo.getUserBaseByEmail = createMockFn(async () => null)

            // Act
            await service.requestUsername('nonexistent@example.com')

            // Assert
            assert.equal(email.sendTemplate.callCount, 0)
        })

        it('should silently return when user has no username', async () => {
            // Arrange
            repo.getUserBaseByEmail = createMockFn(async () => ({
                ...VALID_USER_ROW,
                username: '',
            }))

            // Act
            await service.requestUsername('test@example.com')

            // Assert
            assert.equal(email.sendTemplate.callCount, 0)
        })
    })
})
