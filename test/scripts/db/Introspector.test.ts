import { describe, it, mock } from 'node:test'
import assert from 'node:assert'
import 'colors'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
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

    it('should include foreign keys inline at the end of the table definition', () => {
        const introspector = new Introspector(mockDb as any, '/tmp', '/tmp')
        const columns = [
            {
                column_name: 'category_id',
                data_type: 'integer',
                is_nullable: 'NO',
                column_default: "nextval('business.category_category_id_seq'::regclass)",
            },
            {
                column_name: 'category_description',
                data_type: 'text',
                is_nullable: 'NO',
                column_default: null,
            },
            {
                column_name: 'category_type_id',
                data_type: 'integer',
                is_nullable: 'NO',
                column_default: null,
            },
        ]

        const foreignKeys = [
            'foreign key (category_type_id) references business.category_type (category_type_id)'
        ]

        const content = introspector.generateSchemaFile(
            'business', 'category', columns, [], [], ['category_id'], foreignKeys
        )

        assert.ok(content.includes('category_type_id integer not null,'),
            `Expected trailing comma after last column but got: ${content}`)
        assert.ok(content.includes('foreign key (category_type_id) references business.category_type (category_type_id)'),
            `Expected foreign key constraint but got: ${content}`)
    })

    it('should optionally export security data files without generating security DDL', async () => {
        const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'introspector-'))
        const ddlDir = path.join(tmpRoot, 'ddl')
        const dmlDir = path.join(tmpRoot, 'dml')
        await fs.mkdir(ddlDir, { recursive: true })
        await fs.mkdir(dmlDir, { recursive: true })

        const db = {
            exeRaw: mock.fn(async (sql: string, params?: any[]) => {
                if (sql.includes('information_schema.tables')) {
                    return {
                        rows: [
                            { table_schema: 'public', table_name: 'config' },
                            { table_schema: 'security', table_name: 'profile' },
                        ],
                        rowCount: 2,
                    }
                }

                if (sql.includes('information_schema.columns')) {
                    const table = params?.[1]
                    if (table === 'config') {
                        return {
                            rows: [
                                {
                                    column_name: 'id',
                                    data_type: 'integer',
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

                    if (table === 'profile') {
                        return {
                            rows: [
                                {
                                    column_name: 'profile_id',
                                    data_type: 'integer',
                                    is_nullable: 'NO',
                                    column_default: null,
                                },
                                {
                                    column_name: 'profile_na',
                                    data_type: 'text',
                                    is_nullable: 'NO',
                                    column_default: null,
                                },
                            ],
                            rowCount: 2,
                        }
                    }
                }

                if (sql.includes('FROM   pg_index i')) {
                    const regclass = params?.[0]
                    if (regclass === 'public.config') {
                        return { rows: [{ attname: 'id' }], rowCount: 1 }
                    }
                    if (regclass === 'security.profile') {
                        return { rows: [{ attname: 'profile_id' }], rowCount: 1 }
                    }
                }

                if (sql.includes('information_schema.table_constraints')) {
                    return { rows: [], rowCount: 0 }
                }

                if (sql.includes('FROM pg_indexes')) {
                    return { rows: [], rowCount: 0 }
                }

                if (sql.includes('SELECT * FROM public.config')) {
                    return { rows: [{ id: 1, name: 'main' }], rowCount: 1 }
                }

                if (sql.includes('SELECT * FROM security.profile')) {
                    return {
                        rows: [{ profile_id: 1, profile_na: 'admin' }],
                        rowCount: 1,
                    }
                }

                return { rows: [], rowCount: 0 }
            }),
        }

        const introspector = new Introspector(db as any, ddlDir, dmlDir)
        const generated = await introspector.introspectAll({
            withData: true,
            securityDataTables: ['profile'],
        })

        const generatedNames = generated.map((file) => path.basename(file))

        assert.ok(
            generatedNames.some((name) => name.includes('public_config') && !name.startsWith('90_data_')),
            `Expected public DDL file but got: ${generatedNames.join(', ')}`
        )
        assert.ok(
            generatedNames.some((name) => name.includes('public_config') && name.startsWith('90_data_')),
            `Expected public data file but got: ${generatedNames.join(', ')}`
        )
        assert.ok(
            generatedNames.some((name) => name.includes('security_profile') && name.startsWith('90_data_')),
            `Expected security data file but got: ${generatedNames.join(', ')}`
        )
        assert.ok(
            !generatedNames.some((name) => name.includes('security_profile') && !name.startsWith('90_data_')),
            `Did not expect security DDL file: ${generatedNames.join(', ')}`
        )

        await fs.rm(tmpRoot, { recursive: true, force: true })
    })

    it('should introspect only selected includeTables', async () => {
        const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'introspector-include-'))
        const ddlDir = path.join(tmpRoot, 'ddl')
        const dmlDir = path.join(tmpRoot, 'dml')
        await fs.mkdir(ddlDir, { recursive: true })
        await fs.mkdir(dmlDir, { recursive: true })

        const db = {
            exeRaw: mock.fn(async (sql: string, params?: any[]) => {
                if (sql.includes('information_schema.tables')) {
                    return {
                        rows: [
                            { table_schema: 'public', table_name: 'group' },
                            { table_schema: 'public', table_name: 'item' },
                        ],
                        rowCount: 2,
                    }
                }

                if (sql.includes('information_schema.columns')) {
                    const table = params?.[1]
                    if (table === 'group') {
                        return {
                            rows: [
                                {
                                    column_name: 'group_id',
                                    data_type: 'integer',
                                    is_nullable: 'NO',
                                    column_default: null,
                                },
                            ],
                            rowCount: 1,
                        }
                    }

                    if (table === 'item') {
                        return {
                            rows: [
                                {
                                    column_name: 'item_id',
                                    data_type: 'integer',
                                    is_nullable: 'NO',
                                    column_default: null,
                                },
                            ],
                            rowCount: 1,
                        }
                    }
                }

                if (sql.includes('FROM   pg_index i')) {
                    const regclass = params?.[0]
                    if (regclass === 'public.group') {
                        return { rows: [{ attname: 'group_id' }], rowCount: 1 }
                    }
                    if (regclass === 'public.item') {
                        return { rows: [{ attname: 'item_id' }], rowCount: 1 }
                    }
                }

                if (sql.includes('information_schema.table_constraints')) {
                    return { rows: [], rowCount: 0 }
                }

                if (sql.includes('FROM pg_indexes')) {
                    return { rows: [], rowCount: 0 }
                }

                return { rows: [], rowCount: 0 }
            }),
        }

        const introspector = new Introspector(db as any, ddlDir, dmlDir)
        const generated = await introspector.introspectAll({
            includeTables: ['public.group'],
            withData: false,
        })

        const generatedNames = generated.map((file) => path.basename(file))
        assert.ok(
            generatedNames.some((name) => name.includes('public_group')),
            `Expected selected table output but got: ${generatedNames.join(', ')}`
        )
        assert.ok(
            !generatedNames.some((name) => name.includes('public_item')),
            `Did not expect non-selected table output: ${generatedNames.join(', ')}`
        )

        await fs.rm(tmpRoot, { recursive: true, force: true })
    })
})
