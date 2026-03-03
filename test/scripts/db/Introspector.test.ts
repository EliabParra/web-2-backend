import { describe, it, mock } from 'node:test'
import assert from 'node:assert'
import { Introspector } from '../../../scripts/db/core/introspector.js'

// Mock Database
const mockDb = {
    exeRaw: mock.fn(async (sql: string, params?: any[]) => {
        if (sql.includes('information_schema.tables')) {
            return {
                rows: [
                    { table_schema: 'public', table_name: 'products' },
                    { table_schema: 'security', table_name: 'users' },
                ],
                rowCount: 2,
            }
        }
        if (sql.includes('information_schema.columns')) {
            return {
                rows: [
                    {
                        column_name: 'id',
                        data_type: 'bigint',
                        is_nullable: 'NO',
                        column_default: null,
                    },
                    {
                        column_name: 'name',
                        data_type: 'text',
                        is_nullable: 'NO',
                        column_default: null,
                    },
                ],
                rowCount: 2,
            }
        }
        return { rows: [], rowCount: 0 }
    }),
}

describe('Introspector', () => {
    it('should list tables from information_schema', async () => {
        const introspector = new Introspector(mockDb as any, '/tmp', '/tmp')
        const tables = await introspector.listTables()

        assert.strictEqual(tables.length, 2)
        assert.strictEqual(tables[0].table_name, 'products')
        assert.strictEqual(tables[1].table_schema, 'security')
    })

    it('should generate valid CREATE TABLE SQL', async () => {
        const introspector = new Introspector(mockDb as any, '/tmp', '/tmp')
        const columns = await introspector.getColumns('public', 'products')
        const content = introspector.generateSchemaFile('public', 'products', columns)

        assert.ok(content.includes('create table if not exists public.products'))
        assert.ok(content.includes('PRODUCTS_SCHEMA'))
        assert.ok(content.includes('id bigint not null'))
    })

    it('should detect new tables not in known list', async () => {
        const introspector = new Introspector(mockDb as any, '/tmp', '/tmp')
        const newTables = await introspector.detectNewTables(['public.products'])

        assert.strictEqual(newTables.length, 1)
        assert.strictEqual(newTables[0].table_name, 'users')
    })

    it('should convert nextval() column_default to serial type', () => {
        const introspector = new Introspector(mockDb as any, '/tmp', '/tmp')
        const columns = [
            {
                column_name: 'property_id',
                data_type: 'integer',
                is_nullable: 'NO',
                column_default: "nextval('business.property_property_id_seq'::regclass)",
            },
            {
                column_name: 'property_description',
                data_type: 'character varying',
                is_nullable: 'NO',
                column_default: null,
            },
            {
                column_name: 'property_value',
                data_type: 'integer',
                is_nullable: 'NO',
                column_default: null,
            },
        ]

        const content = introspector.generateSchemaFile(
            'business', 'property', columns, [], [], ['property_id']
        )

        // Debe usar 'serial' en vez de 'integer ... nextval(...)'
        assert.ok(content.includes('property_id serial primary key'),
            `Expected 'serial primary key' but got: ${content}`)
        // NO debe contener nextval
        assert.ok(!content.includes('nextval'),
            `Should not contain nextval but got: ${content}`)
        // Columnas normales deben mantener su tipo
        assert.ok(content.includes('property_description character varying not null'))
        assert.ok(content.includes('property_value integer not null'))
    })

    it('should convert bigint nextval() to bigserial type', () => {
        const introspector = new Introspector(mockDb as any, '/tmp', '/tmp')
        const columns = [
            {
                column_name: 'user_id',
                data_type: 'bigint',
                is_nullable: 'NO',
                column_default: "nextval('security.users_user_id_seq'::regclass)",
            },
        ]

        const content = introspector.generateSchemaFile(
            'security', 'users', columns, [], [], ['user_id']
        )

        assert.ok(content.includes('user_id bigserial primary key'),
            `Expected 'bigserial primary key' but got: ${content}`)
    })

    it('should include primary key inline for non-serial columns', () => {
        const introspector = new Introspector(mockDb as any, '/tmp', '/tmp')
        const columns = [
            {
                column_name: 'code',
                data_type: 'text',
                is_nullable: 'NO',
                column_default: null,
            },
            {
                column_name: 'value',
                data_type: 'integer',
                is_nullable: 'YES',
                column_default: null,
            },
        ]

        const content = introspector.generateSchemaFile(
            'public', 'config', columns, [], [], ['code']
        )

        assert.ok(content.includes('code text not null primary key'),
            `Expected 'primary key' on code column but got: ${content}`)
        assert.ok(!content.includes('value integer primary key'),
            'value column should NOT have primary key')
    })
})
