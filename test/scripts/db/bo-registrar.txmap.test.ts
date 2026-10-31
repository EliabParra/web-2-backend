import { describe, it } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import { BORegistrar } from '../../../scripts/db/seeders/bo-register.js'

// In-memory fake of an empty security schema; records tx numbers and grants.
function createFreshDB() {
    const objects: string[] = []
    const methods: string[] = []
    const txMap: Record<string, number> = {}
    const grantedProfiles = new Set<number>()

    return {
        txMap,
        grantedProfiles,
        async exeRaw(query: string, params: any[] = []) {
            if (query.includes('FROM security.profile WHERE')) return { rows: [{}], rowCount: 1 }
            if (query.includes('INSERT INTO security.object ')) {
                objects.push(params[0])
                return { rows: [{ object_id: objects.length }] }
            }
            if (query.includes('INSERT INTO security.method ')) {
                methods.push(params[0])
                return { rows: [{ method_id: methods.length }] }
            }
            if (query.includes('SELECT method_id FROM security.method')) {
                const id = methods.indexOf(params[0]) + 1
                return { rows: id ? [{ method_id: id }] : [] }
            }
            if (query.includes('INSERT INTO security.transaction')) {
                const [tx, methodId, objectId] = params
                txMap[`${objects[objectId - 1]}.${methods[methodId - 1]}`] = Number(tx)
            }
            if (query.includes('INSERT INTO security.profile_method')) grantedProfiles.add(params[0])
            return { rows: [] }
        },
    }
}

describe('BORegistrar tx map (fresh install, txStart 1000)', () => {
    it('assigns the shared-contract tx numbers and grants only profile 3', async () => {
        const db = createFreshDB()
        const registrar = new BORegistrar(db as any, path.resolve('BO'))

        await registrar.registerAll({ profileId: 3, txStart: 1000 })

        const expected: Record<string, number> = {
            'Auth.register': 1000,
            'Auth.getNavigation': 1007,
            'Category.get': 1009,
            'Category.getAll': 1010,
            'Category.create': 1011,
            'Category.update': 1012,
            'Category.delete': 1013,
            'Component.get': 1014,
            'Component.getAll': 1015,
            'Component.create': 1016,
            'Component.update': 1017,
            'Component.delete': 1018,
            'Inventory.get': 1033,
            'Inventory.getAll': 1034,
            'Inventory.create': 1035,
            'Inventory.update': 1036,
            'Inventory.delete': 1037,
            'Inventory.addStock': 1038,
            'Inventory.removeStock': 1039,
            'Inventory.moveLocation': 1040,
            'Location.getAll': 1054,
            'Location.create': 1055,
            'Location.update': 1056,
            'Location.delete': 1057,
            'Location.get': 1058,
        }
        const actual = Object.fromEntries(Object.keys(expected).map((k) => [k, db.txMap[k]]))

        assert.deepStrictEqual(actual, expected)
        assert.deepStrictEqual([...db.grantedProfiles], [3])
    })
})
