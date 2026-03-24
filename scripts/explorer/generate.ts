import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'
import { Pool } from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_BO_DIR = path.resolve(__dirname, '../../BO')
const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, 'spec.json')

interface SchemaField {
    type: string
    optional: boolean
}

interface TxSpec {
    tx: number
    name: string
    description: string
    payloadSchema: Record<string, SchemaField>
}

type MethodInfo = {
    className: string
    methodName: string
    schemaKey: string
}

function findBOFiles(dir: string): string[] {
    const results: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            results.push(...findBOFiles(fullPath))
        } else if (entry.name.endsWith('BO.ts') && !entry.name.includes('BaseBO')) {
            results.push(fullPath)
        }
    }
    return results
}

function getNameText(name: ts.PropertyName): string | null {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text
    }
    return null
}

function inferFieldTypeFromText(text: string): string {
    if (/z\.(array|tuple)|\.array\(/.test(text)) return 'array'
    if (/z\.(coerce\.)?number|\.int\(/.test(text)) return 'number'
    if (/z\.(coerce\.)?boolean/.test(text)) return 'boolean'
    if (/z\.(date|coerce\.date)|datetime|dateTime/.test(text)) return 'string'
    if (/z\.(enum|literal)/.test(text)) return 'string'
    if (/z\.(object|record|map)/.test(text)) return 'object'
    return 'string'
}

function isOptionalZodExpression(text: string): boolean {
    return text.includes('.optional(') || text.includes('.optional()')
}

function findSchemaKeyInMethod(node: ts.MethodDeclaration): string | null {
    if (!node.body) return null

    let schemaKey: string | null = null

    const visit = (child: ts.Node): void => {
        if (schemaKey) return

        if (ts.isCallExpression(child)) {
            const expr = child.expression
            if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'exec' && child.arguments.length >= 2) {
                const schemaArg = child.arguments[1]
                if (ts.isPropertyAccessExpression(schemaArg)) {
                    schemaKey = schemaArg.name.text
                    return
                }
                if (ts.isElementAccessExpression(schemaArg) && ts.isStringLiteral(schemaArg.argumentExpression)) {
                    schemaKey = schemaArg.argumentExpression.text
                    return
                }
            }
        }

        ts.forEachChild(child, visit)
    }

    ts.forEachChild(node.body, visit)
    return schemaKey
}

export function extractMethodsFromBoSource(sourceText: string): MethodInfo[] {
    const sourceFile = ts.createSourceFile('bo.ts', sourceText, ts.ScriptTarget.Latest, true)
    const methods: MethodInfo[] = []

    const visit = (node: ts.Node): void => {
        if (ts.isClassDeclaration(node) && node.name) {
            const className = node.name.text
            const extendsBaseBO =
                node.heritageClauses?.some((clause) =>
                    clause.token === ts.SyntaxKind.ExtendsKeyword &&
                    clause.types.some((typeNode) => typeNode.expression.getText(sourceFile) === 'BaseBO')
                ) ?? false

            if (!extendsBaseBO) {
                ts.forEachChild(node, visit)
                return
            }

            for (const member of node.members) {
                if (!ts.isMethodDeclaration(member) || !member.name) continue

                const isAsync =
                    member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ??
                    false
                if (!isAsync) continue

                const methodName = ts.isIdentifier(member.name) ? member.name.text : null
                if (!methodName) continue

                const schemaKey = findSchemaKeyInMethod(member) ?? methodName
                methods.push({ className, methodName, schemaKey })
            }
        }

        ts.forEachChild(node, visit)
    }

    ts.forEachChild(sourceFile, visit)
    return methods
}

function unwrapToZodObjectArgument(
    expression: ts.Expression,
    sourceFile: ts.SourceFile
): ts.ObjectLiteralExpression | null {
    let current: ts.Expression | undefined = expression

    for (let i = 0; i < 12 && current; i++) {
        if (ts.isCallExpression(current)) {
            const callExpr: ts.LeftHandSideExpression = current.expression

            if (
                ts.isPropertyAccessExpression(callExpr) &&
                ts.isIdentifier(callExpr.expression) &&
                callExpr.expression.text === 'z' &&
                callExpr.name.text === 'object'
            ) {
                const arg = current.arguments[0]
                if (arg && ts.isObjectLiteralExpression(arg)) return arg
            }

            if (ts.isPropertyAccessExpression(callExpr)) {
                current = callExpr.expression
                continue
            }

            current = callExpr
            continue
        }

        if (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
            current = current.expression
            continue
        }

        const text = current.getText(sourceFile)
        if (text.includes('z.object(')) {
            return null
        }

        break
    }

    return null
}

function findSchemaPropertyAssignment(
    sourceFile: ts.SourceFile,
    schemaKey: string
): ts.PropertyAssignment | null {
    let found: ts.PropertyAssignment | null = null

    const visit = (node: ts.Node): void => {
        if (found) return

        if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === schemaKey) {
            found = node
            return
        }

        ts.forEachChild(node, visit)
    }

    ts.forEachChild(sourceFile, visit)
    return found
}

export function extractSchemaFieldsFromSource(
    sourceText: string,
    schemaKey: string
): Record<string, SchemaField> {
    const sourceFile = ts.createSourceFile('schema.ts', sourceText, ts.ScriptTarget.Latest, true)
    const fields: Record<string, SchemaField> = {}

    const foundProperty = findSchemaPropertyAssignment(sourceFile, schemaKey)
    if (!foundProperty) return fields

    const objectLiteral = unwrapToZodObjectArgument(foundProperty.initializer, sourceFile)
    if (!objectLiteral) return fields

    for (const prop of objectLiteral.properties) {
        if (!ts.isPropertyAssignment(prop)) continue
        const name = getNameText(prop.name)
        if (!name) continue

        const text = prop.initializer.getText(sourceFile)
        fields[name] = {
            type: inferFieldTypeFromText(text),
            optional: isOptionalZodExpression(text),
        }
    }

    return fields
}

async function loadTxMapFromDb(): Promise<Map<string, number>> {
    const txMap = new Map<string, number>()

    const hasConnection =
        Boolean(process.env.DATABASE_URL) ||
        (Boolean(process.env.PGHOST) && Boolean(process.env.PGUSER) && Boolean(process.env.PGDATABASE))

    if (!hasConnection) return txMap

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })

    try {
        const result = await pool.query<{
            tx: number | string
            object_na: string
            method_na: string
        }>(`
            SELECT t.transaction_nu as tx, o.object_na, m.method_na
            FROM security.transaction t
            INNER JOIN security.method m ON t.method_id = m.method_id
            INNER JOIN security.object o ON t.object_id = o.object_id
        `)

        for (const row of result.rows) {
            const tx = typeof row.tx === 'number' ? row.tx : Number(row.tx)
            if (!Number.isFinite(tx)) continue

            const objectName = String(row.object_na || '').trim()
            const methodName = String(row.method_na || '').trim()
            if (!objectName || !methodName) continue

            txMap.set(`${objectName}.${methodName}`.toLowerCase(), tx)
        }
    } finally {
        await pool.end()
    }

    return txMap
}

function resolveTxNumber(
    txMap: Map<string, number>,
    className: string,
    methodName: string,
    fallbackTx: number
): number {
    const rawObject = className.replace(/BO$/, '')
    const candidates = [
        `${className}.${methodName}`,
        `${rawObject}.${methodName}`,
        `${rawObject.toLowerCase()}.${methodName}`,
        `${rawObject.toLowerCase()}.${methodName.toLowerCase()}`,
    ]

    for (const candidate of candidates) {
        const tx = txMap.get(candidate.toLowerCase())
        if (typeof tx === 'number') return tx
    }

    return fallbackTx
}

export async function generateExplorerSpec(options?: {
    boDir?: string
    outputPath?: string
    includeDbTxSync?: boolean
}): Promise<TxSpec[]> {
    const boDir = options?.boDir ?? DEFAULT_BO_DIR
    const outputPath = options?.outputPath ?? DEFAULT_OUTPUT_PATH
    const includeDbTxSync = options?.includeDbTxSync ?? true

    if (!fs.existsSync(boDir)) {
        throw new Error(`Directorio BO no encontrado: ${boDir}`)
    }

    const boFiles = findBOFiles(boDir)
    const txMap = includeDbTxSync ? await loadTxMapFromDb() : new Map<string, number>()

    const specs: TxSpec[] = []
    let txCounter = 1

    for (const boFile of boFiles) {
        const boContent = fs.readFileSync(boFile, 'utf-8')
        const methods = extractMethodsFromBoSource(boContent)
        if (methods.length === 0) continue

        const boDirname = path.dirname(boFile)
        const boBaseName = path.basename(boFile, '.ts').replace('BO', '')
        const schemasPath = path.join(boDirname, `${boBaseName}Schemas.ts`)
        const schemaContent = fs.existsSync(schemasPath) ? fs.readFileSync(schemasPath, 'utf-8') : ''

        for (const method of methods) {
            const payloadSchema = schemaContent
                ? extractSchemaFieldsFromSource(schemaContent, method.schemaKey)
                : {}

            const tx = resolveTxNumber(txMap, method.className, method.methodName, txCounter)
            txCounter += 1

            specs.push({
                tx,
                name: `${method.className}.${method.methodName}`,
                description: `Auto-generado de ${path.basename(boFile)}`,
                payloadSchema,
            })
        }
    }

    specs.sort((a, b) => a.tx - b.tx || a.name.localeCompare(b.name))
    fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2), 'utf-8')
    return specs
}

async function main(): Promise<void> {
    console.log('🔍 Escaneando Business Objects...\n')
    const specs = await generateExplorerSpec({ includeDbTxSync: true })
    console.log(`✨ Generado: ${DEFAULT_OUTPUT_PATH}`)
    console.log(`   Total transacciones: ${specs.length}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`❌ Error generando explorer spec: ${message}`)
        process.exit(1)
    })
}
