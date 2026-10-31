import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
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
    let repo: MockUserRepo

    beforeEach(() => {
        const mocks = createUserServiceWithMocks()
        service = mocks.service
        security = mocks.security
        repo = mocks.repo
    })

    it('create guarda el password hasheado y no lo devuelve', async () => {
        repo.create = createMockFn(async (data: { user_pw: string }) => ({ user_id: 1, user_na: 'ana', ...data }))
        Object.assign(service, { repo })

        const user = await service.create({ user_na: 'ana', user_pw: 'secret123' })

        const stored = (repo.create.calls[0] as [{ user_pw: string }])[0].user_pw
        assert.notEqual(stored, 'secret123')
        assert.equal(await bcrypt.compare('secret123', stored), true)
        assert.equal('user_pw' in user, false)
    })

    it('update hashea el password solo si viene', async () => {
        repo.update = createMockFn(async (_id: number, data: object) => ({ user_id: 1, user_pw: 'h', ...data }))
        Object.assign(service, { repo })

        const user = await service.update(1, { user_na: 'ana' })

        assert.equal('user_pw' in (repo.update.calls[0] as [number, object])[1], false)
        assert.equal('user_pw' in user, false)
    })

    it('getAll y getById no devuelven el password', async () => {
        repo.findAll = createMockFn(async () => [{ user_id: 1, user_pw: 'h' }])
        repo.findById = createMockFn(async () => ({ user_id: 1, user_pw: 'h' }))
        Object.assign(service, { repo })

        assert.equal('user_pw' in (await service.getAll())[0], false)
        assert.equal('user_pw' in (await service.getById(1)), false)
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
