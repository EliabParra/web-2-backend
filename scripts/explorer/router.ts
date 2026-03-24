import { Router, Request, Response, NextFunction } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { generateExplorerSpec } from './generate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPEC_PATH = path.resolve(__dirname, 'spec.json')
const HTML_PATH = path.resolve(__dirname, 'index.html')

const EXPLORER_KEY = 'toproc123'

type LookupOption = {
    value: string | number
    label: string
}

function createDbPool(): Pool | null {
    const hasConnection =
        Boolean(process.env.DATABASE_URL) ||
        (Boolean(process.env.PGHOST) && Boolean(process.env.PGUSER) && Boolean(process.env.PGDATABASE))

    if (!hasConnection) return null

    return new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })
}

function isSafeIdentifier(value: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)
}

function qIdent(value: string): string {
    return `"${value.replace(/"/g, '""')}"`
}

function unique(values: string[]): string[] {
    return [...new Set(values)]
}

function toSnakeCaseName(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
}

function buildTableCandidates(fieldName: string): string[] {
    const normalized = toSnakeCaseName(fieldName).replace(/_id$/, '')
    if (!normalized) return []

    const singular = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized
    const plural = singular.endsWith('s') ? singular : `${singular}s`

    return unique([normalized, singular, plural].filter(Boolean))
}

async function findBestLookupTable(pool: Pool, fieldName: string): Promise<{
    schema: string
    table: string
    idColumn: string
    labelColumn: string
} | null> {
    const candidates = buildTableCandidates(fieldName)
    if (candidates.length === 0) return null

    const tableResult = await pool.query<{
        table_schema: string
        table_name: string
    }>(
        `
            SELECT t.table_schema, t.table_name
            FROM information_schema.tables t
            WHERE t.table_schema IN ('business', 'security', 'public')
              AND t.table_name = ANY($1::text[])
            ORDER BY CASE t.table_schema
                WHEN 'business' THEN 0
                WHEN 'security' THEN 1
                ELSE 2
            END
            LIMIT 10
        `,
        [candidates]
    )

    for (const row of tableResult.rows) {
        const colResult = await pool.query<{ column_name: string }>(
            `
                SELECT c.column_name
                FROM information_schema.columns c
                WHERE c.table_schema = $1
                  AND c.table_name = $2
            `,
            [row.table_schema, row.table_name]
        )

        const columns = new Set(colResult.rows.map((col) => col.column_name))
        const base = toSnakeCaseName(fieldName).replace(/_id$/, '')

        const idCandidates = unique([`${base}_id`, `${row.table_name}_id`, 'id'])
        const labelCandidates = unique([
            `${base}_na`,
            `${base}_name`,
            `${row.table_name}_na`,
            `${row.table_name}_name`,
            'name',
            'title',
            'description',
            'code',
            'user_na',
            'category_na',
        ])

        const idColumn = idCandidates.find((col) => columns.has(col))
        const labelColumn = labelCandidates.find((col) => columns.has(col))

        if (idColumn && labelColumn) {
            if (!isSafeIdentifier(row.table_schema) || !isSafeIdentifier(row.table_name)) continue
            if (!isSafeIdentifier(idColumn) || !isSafeIdentifier(labelColumn)) continue

            return {
                schema: row.table_schema,
                table: row.table_name,
                idColumn,
                labelColumn,
            }
        }
    }

    return null
}

async function fetchLookupOptions(fieldName: string, q?: string): Promise<LookupOption[]> {
    const pool = createDbPool()
    if (!pool) return []

    try {
        const table = await findBestLookupTable(pool, fieldName)
        if (!table) return []

        const safeSchema = qIdent(table.schema)
        const safeTable = qIdent(table.table)
        const safeIdColumn = qIdent(table.idColumn)
        const safeLabelColumn = qIdent(table.labelColumn)
        const term = (q || '').trim()

        const sql = `
            SELECT ${safeIdColumn} AS value,
                   ${safeLabelColumn} AS label
            FROM ${safeSchema}.${safeTable}
            ${term ? `WHERE CAST(${safeLabelColumn} AS text) ILIKE $1` : ''}
            ORDER BY ${safeLabelColumn} ASC
            LIMIT 75
        `
        const params = term ? [`%${term}%`] : []

        const result = await pool.query<{ value: string | number; label: string }>(sql, params)
        return result.rows.map((row) => ({ value: row.value, label: String(row.label) }))
    } finally {
        await pool.end()
    }
}

function protectExplorer(req: Request, res: Response, next: NextFunction): void {
    const queryKey = req.query.key as string | undefined
    const headerKey = req.headers['x-explorer-key'] as string | undefined

    if (queryKey === EXPLORER_KEY || headerKey === EXPLORER_KEY) {
        next()
        return
    }

    res.status(403).json({ code: 403, msg: 'Forbidden — Explorer key inválida o ausente.' })
}

export const explorerRouter = Router()

explorerRouter.use(protectExplorer)

explorerRouter.get('/spec', async (req: Request, res: Response) => {
    const forceRefresh = req.query.refresh === '1'

    if (forceRefresh || !fs.existsSync(SPEC_PATH)) {
        try {
            await generateExplorerSpec({ includeDbTxSync: true })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error)
            res.status(500).json({
                code: 500,
                msg: `No se pudo generar spec.json: ${message}`,
            })
            return
        }
    }

    const spec = fs.readFileSync(SPEC_PATH, 'utf-8')
    res.setHeader('Content-Type', 'application/json')
    res.send(spec)
})

explorerRouter.get('/options', async (req: Request, res: Response) => {
    const field = String(req.query.field || '').trim()
    const q = String(req.query.q || '').trim()

    if (!field || !field.endsWith('_id') || !isSafeIdentifier(field)) {
        res.status(400).json({ code: 400, msg: 'Parámetro field inválido. Debe terminar en _id.' })
        return
    }

    try {
        const options = await fetchLookupOptions(field, q)
        res.json({ code: 200, data: options })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        res.status(500).json({ code: 500, msg: `No se pudieron obtener opciones: ${message}` })
    }
})

explorerRouter.get('/', (_req: Request, res: Response) => {
    if (!fs.existsSync(HTML_PATH)) {
        res.status(404).json({ code: 404, msg: 'index.html del Explorer no encontrado.' })
        return
    }

    res.sendFile(HTML_PATH)
})
