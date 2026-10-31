import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { BORegistrar } from '../../../scripts/db/seeders/bo-register.js'

const pinned: Record<string, number> = JSON.parse(
    fs.readFileSync(path.resolve('scripts/db/tx-map.json'), 'utf8')
)

// In-memory fake of the security schema; transaction_nu is UNIQUE like the real table.
function createDB() {
    const objects: string[] = []
    const methods: string[] = []
    const txMap: Record<string, number> = {}
    const grantedProfiles = new Set<number>()
    const keyOf = (methodId: number, objectId: number) =>
        `${objects[objectId - 1]}.${methods[methodId - 1]}`

    return {
        txMap,
        grantedProfiles,
        async exeRaw(query: string, params: any[] = []) {
            if (query.includes('FROM security.profile WHERE')) return { rows: [{}], rowCount: 1 }
            if (query.includes('SELECT object_id FROM security.object')) {
                const id = objects.indexOf(params[0]) + 1
                return { rows: id ? [{ object_id: id }] : [] }
            }
            if (query.includes('INSERT INTO security.object ')) {
                objects.push(params[0])
                return { rows: [{ object_id: objects.length }] }
            }
            if (query.includes('SELECT method_id FROM security.method')) {
                const id = methods.indexOf(params[0]) + 1
                return { rows: id ? [{ method_id: id }] : [] }
            }
            if (query.includes('INSERT INTO security.method ')) {
                methods.push(params[0])
                return { rows: [{ method_id: methods.length }] }
            }
            if (query.includes('FROM security.transaction')) {
                const tx = txMap[keyOf(params[0], params[1])]
                return { rows: tx ? [{ tx }] : [] }
            }
            if (query.includes('INSERT INTO security.transaction')) {
                const [tx, methodId, objectId] = params
                if (Object.values(txMap).includes(Number(tx))) {
                    throw new Error(`duplicate key value violates unique constraint (transaction_nu=${tx})`)
                }
                txMap[keyOf(methodId, objectId)] = Number(tx)
            }
            if (query.includes('INSERT INTO security.profile_method')) grantedProfiles.add(params[0])
            return { rows: [] }
        },
    }
}

// The bo CLI tests run in parallel and briefly create `Zz*` BOs under BO/; ignore them.
function createRegistrar(db: unknown) {
    const registrar = new BORegistrar(db as any, path.resolve('BO'))
    const discover = registrar.discoverBOs.bind(registrar)
    registrar.discoverBOs = async () => (await discover()).filter((bo) => !bo.objectName.startsWith('Zz'))
    return registrar
}

// Simulates a developer adding `Category.archive` to the code base.
function withNewMethod(db: unknown) {
    const registrar = createRegistrar(db)
    const discover = registrar.discoverBOs.bind(registrar)
    registrar.discoverBOs = async () =>
        (await discover()).map((bo) =>
            bo.objectName === 'Category' ? { ...bo, methods: [...bo.methods, { name: 'archive' }] } : bo
        )
    return registrar
}

describe('BORegistrar pinned tx numbers (scripts/db/tx-map.json)', () => {
    it('pins a unique number for every BO method', async () => {
        const bos = await createRegistrar(createDB()).discoverBOs()
        const discovered = bos.flatMap((bo) => bo.methods.map((m) => `${bo.objectName}.${m.name}`))

        assert.deepStrictEqual([...discovered].sort(), Object.keys(pinned).sort())
        assert.strictEqual(new Set(Object.values(pinned)).size, Object.keys(pinned).length)
    })

    it('assigns the pinned numbers on a fresh install and grants only profile 3', async () => {
        const db = createDB()
        await createRegistrar(db).registerAll({ profileId: 3, txMap: pinned })

        assert.deepStrictEqual(db.txMap, pinned)
        assert.deepStrictEqual([...db.grantedProfiles], [3])
    })

    it('keeps existing numbers on update and gives a new method its pinned number', async () => {
        const db = createDB()
        await createRegistrar(db).registerAll({ profileId: 3, txMap: pinned })

        await withNewMethod(db).registerAll({ profileId: 3, txMap: { ...pinned, 'Category.archive': 1119 } })

        assert.strictEqual(db.txMap['Category.archive'], 1119)
        assert.deepStrictEqual({ ...db.txMap, 'Category.archive': undefined }, { ...pinned, 'Category.archive': undefined })
    })

    it('stops with a clear message when a method has no pinned number', async () => {
        await assert.rejects(
            withNewMethod(createDB()).registerAll({ profileId: 3, txMap: pinned }),
            /Category\.archive.*tx-map\.json.*1119/
        )
    })
})
