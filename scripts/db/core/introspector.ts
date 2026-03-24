import { Database } from './db.js'
import fs from 'node:fs/promises'
import path from 'path'
import colors from 'colors'

interface TableInfo {
    table_schema: string
    table_name: string
}

interface ColumnInfo {
    column_name: string
    data_type: string
    is_nullable: string
    column_default: string | null
}

interface IntrospectOptions {
    withData?: boolean
    includeSecurityData?: boolean
    securityDataTables?: string[]
    includeTables?: string[]
    excludeTables?: string[]
}

/**
 * Introspector class - Reads database schema and generates TypeScript files.
 * Implements "DB -> Code" synchronization.
 */
export class Introspector {
    constructor(
        private db: Database,
        private ddlDir: string,
        private dmlDir: string
    ) {}

    private toTableKey(schema: string, table: string): string {
        return `${schema}.${table}`.toLowerCase()
    }

    private normalizeFilterItems(items: string[] | undefined): string[] {
        return (items || []).map((item) => item.trim().toLowerCase()).filter(Boolean)
    }

    private matchesFilter(tableKey: string, tableName: string, filters: string[]): boolean {
        if (filters.length === 0) return true

        return filters.some((filter) => {
            if (filter.includes('.')) return filter === tableKey
            return filter === tableName
        })
    }

    private shouldProcessByFilters(
        tableKey: string,
        tableName: string,
        includeFilters: string[],
        excludeFilters: string[]
    ): boolean {
        const included =
            includeFilters.length === 0 || this.matchesFilter(tableKey, tableName, includeFilters)
        if (!included) return false

        if (excludeFilters.length === 0) return true
        return !this.matchesFilter(tableKey, tableName, excludeFilters)
    }

    private resolveSecuritySelectionKeys(securityDataTables: string[] | undefined): Set<string> {
        const selected = new Set<string>()

        for (const item of this.normalizeFilterItems(securityDataTables)) {
            if (item.includes('.')) {
                selected.add(item)
            } else {
                selected.add(`security.${item}`)
            }
        }

        return selected
    }

    private expandSecurityDependencies(
        selectedKeys: Set<string>,
        dependencies: Map<string, string[]>,
        availableTables: Set<string>
    ): Set<string> {
        const expanded = new Set<string>(selectedKeys)
        const queue = [...selectedKeys]

        while (queue.length > 0) {
            const current = queue.shift() as string
            const refs = dependencies.get(current) || []

            for (const ref of refs) {
                if (!ref.startsWith('security.')) continue
                if (!availableTables.has(ref)) continue
                if (expanded.has(ref)) continue

                expanded.add(ref)
                queue.push(ref)
            }
        }

        return expanded
    }

    /**
     * Lists all user tables in the database (excludes system schemas).
     */
    async listTables(): Promise<TableInfo[]> {
        const result = await this.db.exeRaw(`
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name
        `)
        return result.rows as TableInfo[]
    }

    /**
     * Gets column definitions for a specific table.
     */
    async getColumns(schema: string, table: string): Promise<ColumnInfo[]> {
        const result = await this.db.exeRaw(
            `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
        `,
            [schema, table]
        )
        return result.rows as ColumnInfo[]
    }

    /**
     * Generates a CREATE TABLE statement from column info.
     */
    private generateCreateTable(schema: string, table: string, columns: ColumnInfo[], primaryKeys: string[] = [], foreignKeys: string[] = []): string {
        const colDefs = columns
            .map((col) => {
                const isPk = primaryKeys.includes(col.column_name)

                // Detectar SERIAL: nextval(...) en column_default indica pseudo-tipo SERIAL
                if (col.column_default?.includes('nextval(')) {
                    const serialType = col.data_type === 'bigint' ? 'bigserial' : 'serial'
                    let def = `        ${col.column_name} ${serialType}`
                    if (isPk) def += ' primary key'
                    return def
                }

                let def = `        ${col.column_name} ${col.data_type}`
                if (col.is_nullable === 'NO') def += ' not null'
                if (col.column_default) def += ` default ${col.column_default}`
                if (isPk) def += ' primary key'
                return def
            })
            .join(',\n')

        const tableConstraints = [...foreignKeys]
        if (tableConstraints.length > 0) {
            return `create table if not exists ${schema}.${table} (\n${colDefs},\n        ${tableConstraints.join(',\n        ')}\n    );`
        }

        return `create table if not exists ${schema}.${table} (\n${colDefs}\n    );`
    }

    /**
     * Generates a TypeScript schema file for a table.
     */
    /**
     * Introspects the entire database and generates schema files.
     * Skips tables that are already defined in local files.
     */
    /**
     * Obtiene el índice topológico de las tablas basándose en sus dependencias foráneas.
     */
    async calculateTopology(
        tables: TableInfo[],
        dependenciesInput?: Map<string, string[]>
    ): Promise<Map<string, number>> {
        const topology = new Map<string, number>()
        const unassigned = new Set(tables.map(t => `${t.table_schema}.${t.table_name}`))

        const dependencies = dependenciesInput || (await this.getTableDependencies(tables))

        // Resolución de Niveles Iterativa DAG
        let currentLevel = 0
        let hasChanges = true

        while (unassigned.size > 0 && hasChanges) {
            hasChanges = false
            const currentPass = Array.from(unassigned)

            for (const table of currentPass) {
                const reqs = dependencies.get(table) || []
                const allDependenciesMet = reqs.every(req => topology.has(req))

                if (allDependenciesMet) {
                    topology.set(table, currentLevel)
                    unassigned.delete(table)
                    hasChanges = true
                }
            }
            if (hasChanges) currentLevel++
        }

        // Fallback: Si quedan grupos por cyclicos o no encontrados, asignar un peso maximo
        unassigned.forEach(table => {
            console.warn(`⚠️  Warning: Circular or unbound dependency detected on ${table}`)
            topology.set(table, currentLevel)
        });

        return topology
    }

    async getTableDependencies(tables: TableInfo[]): Promise<Map<string, string[]>> {
        const dependencies = new Map<string, string[]>()

        for (const t of tables) {
            const tableName = this.toTableKey(t.table_schema, t.table_name)
            const rawFks = await this.getForeignKeys(t.table_schema, t.table_name)

            const refs = rawFks
                .map((fk) => {
                    const match = fk.match(/references\s+([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)/i)
                    return match ? match[1].toLowerCase() : null
                })
                .filter((ref) => ref !== null && ref !== tableName) as string[]

            dependencies.set(tableName, refs)
        }

        return dependencies
    }

    /**
     * Scans the output directory for existing table definitions in .ts files.
     * Returns a Map of "schema.table" -> "filename".
     */
    async scanExistingSchemas(): Promise<Map<string, string>> {
        const existingTables = new Map<string, string>()

        try {
            const files = await fs.readdir(this.ddlDir)
            for (const file of files) {
                if (!file.endsWith('.ts')) continue

                const filePath = path.join(this.ddlDir, file)
                const content = await fs.readFile(filePath, 'utf-8')

                const regex =
                    /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/gi
                let match
                while ((match = regex.exec(content)) !== null) {
                    const schema = match[1].toLowerCase()
                    const table = match[2].toLowerCase()
                    existingTables.set(`${schema}.${table}`, file)
                }
            }
        } catch (e) {
            console.warn('⚠️  Could not scan existing schemas:', e)
        }

        return existingTables
    }

    /**
     * Introspects the entire database and generates schema files.
     * Skips tables that are already defined in MANUALLY managed files.
     * Updates tables that are in AUTO-GENERATED files.
     */
    async introspectAll(options: IntrospectOptions = {}): Promise<string[]> {
        console.log('\n🔍 Introspecting database...'.cyan)

        const tables = await this.listTables()
        const existingTables = await this.scanExistingSchemas()
        const includeFilters = this.normalizeFilterItems(options.includeTables)
        const excludeFilters = this.normalizeFilterItems(options.excludeTables)
        const dependencies = await this.getTableDependencies(tables)
        const tableKeySet = new Set(tables.map((t) => this.toTableKey(t.table_schema, t.table_name)))

        console.log(`📊 Found ${tables.length} tables in DB.`.gray)
        console.log(`📂 Found ${existingTables.size} tables already defined in code.`.gray)

        const topology = await this.calculateTopology(tables, dependencies)
        const generatedFiles: string[] = []
        const selectedSecurityData = this.expandSecurityDependencies(
            this.resolveSecuritySelectionKeys(options.securityDataTables),
            dependencies,
            tableKeySet
        )

        if (selectedSecurityData.size > 0) {
            console.log(
                `🔐 Security data scope: ${Array.from(selectedSecurityData).sort().join(', ')}`.gray
            )
        }

        // Sorting tables topologically, then alphabetically
        const sortedTables = [...tables].sort((a, b) => {
            const keyA = `${a.table_schema}.${a.table_name}`
            const keyB = `${b.table_schema}.${b.table_name}`
            const levelA = topology.get(keyA) || 0
            const levelB = topology.get(keyB) || 0

            if (levelA !== levelB) return levelA - levelB
            return keyA.localeCompare(keyB)
        })

        for (const table of sortedTables) {
            const tableKey = this.toTableKey(table.table_schema, table.table_name)
            const isSecurityTable = table.table_schema === 'security'

            if (
                !this.shouldProcessByFilters(
                    tableKey,
                    table.table_name.toLowerCase(),
                    includeFilters,
                    excludeFilters
                )
            ) {
                console.log(`   ⏭️  Filtered out: ${tableKey}`.yellow)
                continue
            }

            if (table.table_schema === 'security') {
                const shouldExportSecurityData =
                    options.withData === true &&
                    (options.includeSecurityData === true || selectedSecurityData.has(tableKey))

                if (shouldExportSecurityData) {
                    const data = await this.getData(table.table_schema, table.table_name)
                    if (data.length > 0) {
                        console.log(
                            `      📝 Found ${data.length} records in ${table.table_name} (Security Data)`
                                .gray
                        )
                        const priority = this.getTablePriority(
                            table.table_schema,
                            table.table_name,
                            topology
                        )
                        const dataContent = this.generateDataFile(
                            table.table_schema,
                            table.table_name,
                            data
                        )
                        const dataFilename = `90_data_${priority}_${table.table_schema}_${table.table_name}.ts`
                        const dataFilepath = path.join(this.dmlDir, dataFilename)

                        await fs.writeFile(dataFilepath, dataContent, 'utf-8')
                        console.log(`   ✅ Generated Security Data: ${dataFilename}`.green)
                        generatedFiles.push(dataFilepath)
                    }
                } else {
                    console.log(`   ⏭️  Ignoring Security table DDL: ${tableKey}`.yellow)
                }
                continue
            }

            // Excluir tabla de infraestructura interna del CLI
            if (table.table_name === '_migration_history') {
                console.log(
                    `   ⏭️  Ignoring CLI infrastructure: ${table.table_schema}.${table.table_name}`
                        .yellow
                )
                continue
            }

            const key = tableKey
            const existingFile = existingTables.get(key)
            let shouldProcess = true

            // If table exists, check if we should update it
            if (existingFile) {
                // Heuristic: Only update if it looks auto-generated
                // Standard: 80-89 are auto-generated.
                // Legacy support: 'auto_' prefix.
                const isAutoGenerated = /^(8[0-9]_|auto_)/.test(existingFile)

                if (!isAutoGenerated) {
                    // Start manually managed file -> Skip overwriting schema
                    shouldProcess = false

                    // CHANGE: If we want data, we might still need to generate a data-only file
                    if (options.withData) {
                        const data = await this.getData(table.table_schema, table.table_name)
                        if (data.length > 0) {
                            console.log(
                                `      📝 Found ${data.length} records in ${table.table_name} (Manual Table)`
                                    .gray
                            )
                            const priority = this.getTablePriority(
                                table.table_schema,
                                table.table_name,
                                topology
                            )
                            const dataContent = this.generateDataFile(
                                table.table_schema,
                                table.table_name,
                                data
                            )
                            const dataFilename = `90_data_${priority}_${table.table_schema}_${table.table_name}.ts`
                            const dataFilepath = path.join(this.dmlDir, dataFilename)

                            await fs.writeFile(dataFilepath, dataContent, 'utf-8')
                            console.log(`   ✅ Generated Data: ${dataFilename}`.green)
                            generatedFiles.push(dataFilepath)
                        }
                    }
                }
            }

            if (!shouldProcess) continue

            const columns = await this.getColumns(table.table_schema, table.table_name)
            const primaryKeys = await this.getPrimaryKey(table.table_schema, table.table_name)
            const foreignKeys = await this.getForeignKeys(table.table_schema, table.table_name)
            let indexes: string[] = []

            indexes = await this.getIndexes(table.table_schema, table.table_name)

            // Filtrar índices de PK que ya se declaran inline en el CREATE TABLE
            indexes = indexes.filter(idx => !idx.includes('_pkey'))

            // When writing a new file, we ALSO need to handle data extraction to DML
            if (options.withData) {
                const data = await this.getData(table.table_schema, table.table_name)
                if (data.length > 0) {
                    console.log(`      📝 Found ${data.length} records in ${table.table_name}`.gray)
                    const priority = this.getTablePriority(
                        table.table_schema,
                        table.table_name,
                        topology
                    )
                    const dataContent = this.generateDataFile(
                        table.table_schema,
                        table.table_name,
                        data
                    )
                    const dataFilename = `90_data_${priority}_${table.table_schema}_${table.table_name}.ts`
                    const dataFilepath = path.join(this.dmlDir, dataFilename)

                    await fs.writeFile(dataFilepath, dataContent, 'utf-8')
                    console.log(`   ✅ Generated Data: ${dataFilename}`.green)
                    generatedFiles.push(dataFilepath)
                }
            }

            const content = this.generateSchemaFile(
                table.table_schema,
                table.table_name,
                columns,
                indexes,
                [], // Ensure we NEVER inject data into the DDL file anymore
                primaryKeys,
                foreignKeys
            )

            // Determine filename: Use existing if available, else new standardized name
            const topLevel = topology.get(tableKey) || 0
            const prefixTopological = 80 + topLevel // 80, 81, 82 ...
            const filename = existingFile || `${prefixTopological}_${table.table_schema}_${table.table_name}.ts`
            const filepath = path.join(this.ddlDir, filename)

            await fs.writeFile(filepath, content, 'utf-8')
            const statusIcon = existingFile ? '🔄 Updated' : '✅ Generated'
            console.log(`   ${statusIcon}: ${filename}`.green)
            generatedFiles.push(filepath)
        }

        console.log(`\n🎉 Processed ${generatedFiles.length} schema files.`.green.bold)
        return generatedFiles
    }

    /**
     * Gets indexes for a specific table.
     */
    async getIndexes(schema: string, table: string): Promise<string[]> {
        const result = await this.db.exeRaw(
            `
            SELECT indexdef
            FROM pg_indexes
            WHERE schemaname = $1 AND tablename = $2
            ORDER BY indexname
        `,
            [schema, table]
        )
        return result.rows.map((r: any) => r.indexdef + ';')
    }

    /**
     * Gets all data rows formatted as INSERT statements.
     */
    async getData(schema: string, table: string): Promise<string[]> {
        // Warning: This could be heavy for large tables.
        // For introspection, we assume relatively small config/seed tables.
        const result = await this.db.exeRaw(`SELECT * FROM ${schema}.${table}`)

        if (result.rows.length === 0) return []

        const columns = Object.keys(result.rows[0])
        const pk = await this.getPrimaryKey(schema, table)
        const inserts: string[] = []

        for (const row of result.rows) {
            const values = columns.map((col) => this.formatValue(row[col]))

            let sql = `INSERT INTO ${schema}.${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`

            // Add ON CONFLICT if we have a PK
            if (pk.length > 0) {
                const pkString = pk.join(', ')
                const updates = columns
                    .filter((col) => !pk.includes(col))
                    .map((col) => `${col} = EXCLUDED.${col}`)
                    .join(', ')

                sql += ` ON CONFLICT (${pkString}) DO UPDATE SET ${updates || `${pk[0]} = EXCLUDED.${pk[0]}`};`
            } else {
                sql += ';'
            }

            inserts.push(sql)
        }

        return inserts
    }

    /**
     * Gets the primary key column names for a table.
     */
    async getPrimaryKey(schema: string, table: string): Promise<string[]> {
        const result = await this.db.exeRaw(
            `
            SELECT a.attname
            FROM   pg_index i
            JOIN   pg_attribute a ON a.attrelid = i.indrelid
                                AND a.attnum = ANY(i.indkey)
            WHERE  i.indrelid = $1::regclass
            AND    i.indisprimary
            `,
            [`${schema}.${table}`]
        )
        return result.rows.map((r) => r.attname)
    }

    /**
     * Gets foreign key constraints for a table.
     */
    async getForeignKeys(schema: string, table: string): Promise<string[]> {
        const result = await this.db.exeRaw(
            `
            SELECT
                kcu.column_name,
                ccu.table_schema AS foreign_schema,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column
            FROM
                information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = $1
              AND tc.table_name = $2;
            `,
            [schema, table]
        )

        return result.rows.map(
            (r: any) => `foreign key (${r.column_name}) references ${r.foreign_schema}.${r.foreign_table} (${r.foreign_column})`
        )
    }

    /**
     * Formats a JS value into a SQL literal.
     * Use with caution, strictly for introspection purposes.
     */
    private formatValue(val: unknown): string {
        if (val === null || val === undefined) return 'NULL'
        if (typeof val === 'number') return String(val)
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
        if (val instanceof Date) return `'${val.toISOString()}'`

        // Escape single quotes for strings/objects
        let str = String(val)
        if (typeof val === 'object') str = JSON.stringify(val)

        return `'${str.replace(/'/g, "''")}'`
    }

    /**
     * Generates a TypeScript schema file.
     */
    generateSchemaFile(
        schema: string,
        table: string,
        columns: ColumnInfo[],
        indexes: string[] = [],
        data: string[] = [],
        primaryKeys: string[] = [],
        foreignKeys: string[] = []
    ): string {
        const createSql = this.generateCreateTable(schema, table, columns, primaryKeys, foreignKeys)
        const constName = `${table.toUpperCase()}_SCHEMA`

        const parts = ['    // Table Definition', `    \`${createSql}\`,`]

        if (data.length > 0) {
            parts.push('\n    // Data Seeding')
            data.forEach((row) => parts.push(`    \`${row}\`, `))
        }

        if (indexes.length > 0) {
            parts.push('\n    // Indexes')
            indexes.forEach((idx) => parts.push(`    \`${idx}\`, `))
        }

        return `/**
 * Auto-generated schema for ${schema}.${table}
 * Generated at: ${new Date().toISOString()}
 */
export const ${constName} = [
${parts.join('\n')}
]
`
    }

    /**
     * Generates a TypeScript data-only file.
     */
    generateDataFile(schema: string, table: string, data: string[]): string {
        const constName = `DATA_${table.toUpperCase()}_SCHEMA`
        const parts = data.map((row) => `    \`${row}\`,`)

        return `/**
 * Auto-generated data for ${schema}.${table}
 * Generated at: ${new Date().toISOString()}
 */
export const ${constName} = [
${parts.join('\n')}
]
`
    }

    /**
     * Returns a sort priority for data files based on dependencies.
     * Lower number = Earlier execution.
     */
    private getTablePriority(
        schemaName: string,
        tableName: string,
        topology: Map<string, number>
    ): string {
        const key = `${schemaName}.${tableName}`
        const level = topology.get(key)

        if (typeof level === 'number') {
            return String(level * 10).padStart(3, '0')
        }

        return '999'
    }

    /**
     * Detects tables that exist in DB but not in code (schema drift).
     */
    async detectNewTables(knownTables: string[]): Promise<TableInfo[]> {
        const allTables = await this.listTables()
        const knownSet = new Set(knownTables.map((t) => t.toLowerCase()))

        return allTables.filter(
            (t) => !knownSet.has(`${t.table_schema}.${t.table_name}`.toLowerCase())
        )
    }
}
