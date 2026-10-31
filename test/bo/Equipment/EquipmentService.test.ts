import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EquipmentService } from '../../../BO/Equipment/EquipmentService.js'
import { createTestContainer, createMockFn } from '../../_helpers/test-utils.js'

function createService(codeTaken: boolean) {
    const repo = {
        codeTaken: createMockFn(async () => codeTaken),
        create: createMockFn(async (data: object) => ({ item_id: 1, ...data })),
        update: createMockFn(async (id: number, data: object) => ({ item_id: id, ...data })),
    }
    return { repo, service: new EquipmentService(createTestContainer({ EquipmentRepository: repo })) }
}

describe('EquipmentService unique code', () => {
    it('creates an equipment whose code is free', async () => {
        const { repo, service } = createService(false)

        await service.create({ item_cod: 'OSC-001', item_na: 'Osciloscopio', category_id: 1 })

        assert.deepEqual(repo.codeTaken.calls[0], ['OSC-001', null])
        assert.equal(repo.create.callCount, 1)
    })

    it('rejects a second equipment with the same code', async () => {
        const { repo, service } = createService(true)

        await assert.rejects(
            service.create({ item_cod: 'OSC-001', item_na: 'Osciloscopio', category_id: 1 }),
            (err: Error) => err.name === 'EquipmentAlreadyExistsError'
        )
        assert.equal(repo.create.callCount, 0)
    })

    it('ignores the equipment itself when updating its code', async () => {
        const { repo, service } = createService(false)

        await service.update(7, { item_cod: 'OSC-002' })

        assert.deepEqual(repo.codeTaken.calls[0], ['OSC-002', 7])
    })

    it('rejects renaming an equipment to a code another equipment uses', async () => {
        const { repo, service } = createService(true)

        await assert.rejects(service.update(7, { item_cod: 'OSC-001' }), (err: Error) => err.name === 'EquipmentAlreadyExistsError')
        assert.equal(repo.update.callCount, 0)
    })

    it('does not check the code when an update leaves it unchanged', async () => {
        const { repo, service } = createService(true)

        await service.update(7, { item_na: 'Osciloscopio digital' })

        assert.equal(repo.codeTaken.callCount, 0)
    })
})
