import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { UserService } from '../../../BO/User/UserService.js'
import { createTestContainer, createMockFn, type MockFn } from '../../_helpers/test-utils.js'
import type { IContainer } from '../../../src/types/core.js'

interface MockUserRepo {
    findAll: MockFn
    findById: MockFn
    create: MockFn
    update: MockFn
    delete: MockFn
    exists: MockFn
}

interface MockSecurity {
    assignProfileToUser: MockFn<[number, number], Promise<boolean>>
    revokeProfileFromUser: MockFn<[number, number], Promise<boolean>>
}

function createUserServiceWithMocks(): {
    service: UserService
    repo: MockUserRepo
    security: MockSecurity
} {
    const repo: MockUserRepo = {
        findAll: createMockFn(async () => []),
        findById: createMockFn(async () => null),
        create: createMockFn(async () => null),
        update: createMockFn(async () => null),
        delete: createMockFn(async () => false),
        exists: createMockFn(async () => false),
    }

    const security: MockSecurity = {
        assignProfileToUser: createMockFn<[number, number], Promise<boolean>>(
            async (_userId, _profileId) => true
        ),
        revokeProfileFromUser: createMockFn<[number, number], Promise<boolean>>(
            async (_userId, _profileId) => true
        ),
    }

    const container: IContainer = createTestContainer({
        UserRepository: repo,
        security,
    })

    return {
        service: new UserService(container),
        repo,
        security,
    }
}

describe('UserService', () => {
    let service: UserService
    let security: MockSecurity

    beforeEach(() => {
        const mocks = createUserServiceWithMocks()
        service = mocks.service
        security = mocks.security
    })

    it('assignProfile delega en SecurityService', async () => {
        const result = await service.assignProfile({ user_id: 10, profile_id: 3 })

        assert.equal(result, true)
        assert.equal(security.assignProfileToUser.callCount, 1)
        assert.deepEqual(security.assignProfileToUser.calls[0], [10, 3])
    })

    it('revokeProfile delega en SecurityService', async () => {
        const result = await service.revokeProfile({ user_id: 10, profile_id: 3 })

        assert.equal(result, true)
        assert.equal(security.revokeProfileFromUser.callCount, 1)
        assert.deepEqual(security.revokeProfileFromUser.calls[0], [10, 3])
    })
})
