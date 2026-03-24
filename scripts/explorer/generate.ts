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
    enumValues?: Array<string | number | boolean>
    format?: 'date' | 'datetime'
    lookup?: LookupSpec
}

interface LookupSpec {
    tx: number
    name: string
    source: 'describe' | 'inferred'
    valueKey?: string
    labelKey?: string
    params?: Record<string, unknown>
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

type MethodEntry = MethodInfo & {
    tx: number
    boFile: string
    schemaContent: string
}

type LookupDescriptor = {
    txName?: string
    valueKey?: string
    labelKey?: string
    params?: Record<string, unknown>
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

function unwrapExpressionNode(expression: ts.Expression): ts.Expression {
    let current = expression
    while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current)) {
        current = current.expression
    }
    return current
}

function getCallName(expr: ts.LeftHandSideExpression): string | null {
    if (ts.isPropertyAccessExpression(expr)) return expr.name.text
    if (ts.isIdentifier(expr)) return expr.text
    return null
}

function inferLiteralType(expression: ts.Expression): SchemaField['type'] {
    if (ts.isNumericLiteral(expression)) return 'number'
    if (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) {
        return 'boolean'
    }
    if (ts.isObjectLiteralExpression(expression) || ts.isArrayLiteralExpression(expression)) {
        return 'object'
    }
    return 'string'
}

function extractLiteralValue(expression: ts.Expression): string | number | boolean | null {
    const node = unwrapExpressionNode(expression)
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
    return null
}

function extractEnumValuesFromExpression(
    expression: ts.Expression,
    sourceFile: ts.SourceFile
): Array<string | number | boolean> | undefined {
    const node = unwrapExpressionNode(expression)
    if (!ts.isCallExpression(node)) return undefined

    if (ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text
        const target = unwrapExpressionNode(node.expression.expression)

        if (ts.isIdentifier(target) && target.text === 'z' && methodName === 'enum') {
            const [firstArg] = node.arguments
            if (firstArg && ts.isArrayLiteralExpression(firstArg)) {
                const values = firstArg.elements
                    .map((el) => extractLiteralValue(el as ts.Expression))
                    .filter((value): value is string | number | boolean => value !== null)
                if (values.length > 0) return values
            }
        }

        if (ts.isIdentifier(target) && target.text === 'z' && methodName === 'literal') {
            const [firstArg] = node.arguments
            if (!firstArg) return undefined
            const value = extractLiteralValue(firstArg)
            return value === null ? undefined : [value]
        }

        if (
            methodName === 'optional' ||
            methodName === 'nullable' ||
            methodName === 'nullish' ||
            methodName === 'default' ||
            methodName === 'catch' ||
            methodName === 'transform' ||
            methodName === 'refine' ||
            methodName === 'superRefine' ||
            methodName === 'pipe' ||
            methodName === 'brand' ||
            methodName === 'describe' ||
            methodName === 'readonly'
        ) {
            return extractEnumValuesFromExpression(target, sourceFile)
        }

        if (methodName === 'or' && node.arguments.length > 0) {
            const leftValues = extractEnumValuesFromExpression(target, sourceFile) ?? []
            const rightValues = extractEnumValuesFromExpression(node.arguments[0], sourceFile) ?? []
            const merged = [...new Set([...leftValues, ...rightValues])]
            return merged.length > 0 ? merged : undefined
        }
    }

    const fallbackText = node.getText(sourceFile)
    if (/z\.enum\(/.test(fallbackText)) {
        const match = fallbackText.match(/z\.enum\(\s*\[(.*?)\]\s*\)/)
        if (match?.[1]) {
            const values = match[1]
                .split(',')
                .map((raw) => raw.trim().replace(/^['"]|['"]$/g, ''))
                .filter(Boolean)
            return values.length > 0 ? values : undefined
        }
    }

    return undefined
}

function inferFieldFormatFromExpression(
    expression: ts.Expression,
    fieldName: string,
    sourceFile: ts.SourceFile
): SchemaField['format'] | undefined {
    const node = unwrapExpressionNode(expression)
    const text = node.getText(sourceFile)
    const lowerFieldName = fieldName.toLowerCase()
    const lowerText = text.toLowerCase()

    if (
        /datetime|datetimelocal|date_time|dateTime/.test(lowerText) ||
        lowerFieldName.endsWith('_datetime') ||
        lowerFieldName.endsWith('_at')
    ) {
        return 'datetime'
    }

    if (
        /\bdate\b|coerce\.date/.test(lowerText) ||
        lowerFieldName.endsWith('_date') ||
        lowerFieldName.endsWith('_dt')
    ) {
        return 'date'
    }

    return undefined
}

function toSnakeCase(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
}

function getMethodObjectName(className: string): string {
    return className.replace(/BO$/, '')
}

function buildEntityCandidates(fieldName: string): string[] {
    const snake = toSnakeCase(fieldName)
    const trimmed = snake.replace(/_(id|nu|code|na|name)$/, '')
    const chunks = trimmed.split('_').filter(Boolean)
    const full = trimmed || snake
    const last = chunks.length > 0 ? chunks[chunks.length - 1] : ''
    const singular = full.endsWith('s') ? full.slice(0, -1) : full
    const plural = singular.endsWith('s') ? singular : `${singular}s`

    return [...new Set([full, singular, plural, last].filter(Boolean))]
}

function parseLookupDescriptorFromDescribeText(text: string): LookupDescriptor | null {
    const jsonMatch = text.match(/lookup\s*:\s*(\{[\s\S]*\})/i)
    if (jsonMatch?.[1]) {
        try {
            const parsed = JSON.parse(jsonMatch[1]) as LookupDescriptor
            return parsed
        } catch {
            // no-op
        }
    }

    const plain = text.match(/lookup\s*=\s*([^;\n]+)/i)
    if (!plain?.[1]) return null

    const descriptor: LookupDescriptor = { txName: plain[1].trim() }
    const valueKey = text.match(/value\s*=\s*([^;\n]+)/i)?.[1]?.trim()
    const labelKey = text.match(/label\s*=\s*([^;\n]+)/i)?.[1]?.trim()
    if (valueKey) descriptor.valueKey = valueKey
    if (labelKey) descriptor.labelKey = labelKey
    return descriptor
}

function extractLookupDescriptorFromExpression(
    expression: ts.Expression,
    sourceFile: ts.SourceFile
): LookupDescriptor | null {
    const node = unwrapExpressionNode(expression)
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
        return null
    }

    const methodName = node.expression.name.text
    const target = node.expression.expression

    if (methodName === 'describe' && node.arguments.length > 0) {
        const [arg] = node.arguments
        if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
            return parseLookupDescriptorFromDescribeText(arg.text)
        }
    }

    return extractLookupDescriptorFromExpression(target, sourceFile)
}

function resolveMethodByName(methods: MethodEntry[], name: string): MethodEntry | null {
    const lowered = name.toLowerCase()
    const [objectName, methodName] = lowered.split('.')

    for (const method of methods) {
        const rawObject = getMethodObjectName(method.className).toLowerCase()
        if (!methodName) {
            if (`${method.className}.${method.methodName}`.toLowerCase() === lowered) return method
            continue
        }

        if (rawObject === objectName && method.methodName.toLowerCase() === methodName) return method
        if (method.className.toLowerCase() === objectName && method.methodName.toLowerCase() === methodName) {
            return method
        }
    }

    return null
}

function inferLookupForField(fieldName: string, methods: MethodEntry[]): MethodEntry | null {
    const preferredMethods = ['getAll', 'list', 'search', 'catalog', 'getOptions', 'getCatalog']
    const candidates = buildEntityCandidates(fieldName)

    const scored: Array<{ score: number; method: MethodEntry }> = []

    for (const method of methods) {
        const objectRaw = getMethodObjectName(method.className).toLowerCase()
        const objectSnake = toSnakeCase(objectRaw)
        const methodLower = method.methodName.toLowerCase()

        let score = 0
        if (candidates.includes(objectSnake)) score += 5
        if (candidates.includes(objectRaw)) score += 5

        const index = preferredMethods.findIndex((prefix) => methodLower.startsWith(prefix))
        if (index >= 0) score += 4 - Math.min(index, 3)

        if (score > 0) scored.push({ score, method })
    }

    scored.sort((a, b) => b.score - a.score || a.method.tx - b.method.tx)
    return scored[0]?.method ?? null
}

function buildLookupSpecForField(
    fieldName: string,
    expression: ts.Expression,
    sourceFile: ts.SourceFile,
    methods: MethodEntry[]
): LookupSpec | undefined {
    const descriptor = extractLookupDescriptorFromExpression(expression, sourceFile)
    if (descriptor?.txName) {
        const method = resolveMethodByName(methods, descriptor.txName)
        if (!method) return undefined

        return {
            tx: method.tx,
            name: `${method.className}.${method.methodName}`,
            source: 'describe',
            ...(descriptor.valueKey ? { valueKey: descriptor.valueKey } : {}),
            ...(descriptor.labelKey ? { labelKey: descriptor.labelKey } : {}),
            ...(descriptor.params ? { params: descriptor.params } : {}),
        }
    }

    const inferred = inferLookupForField(fieldName, methods)
    if (!inferred) return undefined

    return {
        tx: inferred.tx,
        name: `${inferred.className}.${inferred.methodName}`,
        source: 'inferred',
    }
}

function inferTypeFromCallExpression(callExpr: ts.CallExpression, sourceFile: ts.SourceFile): SchemaField['type'] {
    const expressionName = getCallName(callExpr.expression)

    if (ts.isPropertyAccessExpression(callExpr.expression)) {
        const zTarget = callExpr.expression.expression

        if (ts.isIdentifier(zTarget) && zTarget.text === 'z') {
            if (expressionName === 'array' || expressionName === 'tuple') return 'array'
            if (expressionName === 'number' || expressionName === 'bigint') return 'number'
            if (expressionName === 'boolean') return 'boolean'
            if (expressionName === 'string' || expressionName === 'date' || expressionName === 'datetime') {
                return 'string'
            }
            if (expressionName === 'object' || expressionName === 'record' || expressionName === 'map') {
                return 'object'
            }
            if (expressionName === 'enum' || expressionName === 'nativeEnum') return 'string'
            if (expressionName === 'literal' && callExpr.arguments[0]) {
                return inferLiteralType(callExpr.arguments[0])
            }
        }

        if (
            ts.isPropertyAccessExpression(zTarget) &&
            zTarget.name.text === 'coerce' &&
            ts.isIdentifier(zTarget.expression) &&
            zTarget.expression.text === 'z'
        ) {
            if (expressionName === 'number' || expressionName === 'bigint') return 'number'
            if (expressionName === 'boolean') return 'boolean'
            if (expressionName === 'string' || expressionName === 'date') return 'string'
        }
    }

    if (ts.isPropertyAccessExpression(callExpr.expression)) {
        const methodName = callExpr.expression.name.text
        const target = unwrapExpressionNode(callExpr.expression.expression)

        if (methodName === 'array') return 'array'
        if (methodName === 'int' || methodName === 'positive' || methodName === 'min' || methodName === 'max') {
            return inferFieldTypeFromExpression(target, sourceFile)
        }

        // Wrapper calls that preserve shape; infer from inner expression.
        if (
            methodName === 'optional' ||
            methodName === 'nullable' ||
            methodName === 'nullish' ||
            methodName === 'default' ||
            methodName === 'catch' ||
            methodName === 'transform' ||
            methodName === 'refine' ||
            methodName === 'superRefine' ||
            methodName === 'pipe' ||
            methodName === 'brand' ||
            methodName === 'describe' ||
            methodName === 'readonly' ||
            methodName === 'or' ||
            methodName === 'and'
        ) {
            return inferFieldTypeFromExpression(target, sourceFile)
        }
    }

    const fallbackText = callExpr.getText(sourceFile)
    if (/z\.(array|tuple)|\.array\(/.test(fallbackText)) return 'array'
    if (/z\.(coerce\.)?number|\.int\(/.test(fallbackText)) return 'number'
    if (/z\.(coerce\.)?boolean/.test(fallbackText)) return 'boolean'
    if (/z\.(date|coerce\.date)|datetime|dateTime/.test(fallbackText)) return 'string'
    if (/z\.(enum|literal)/.test(fallbackText)) return 'string'
    if (/z\.(object|record|map)/.test(fallbackText)) return 'object'
    return 'string'
}

function inferFieldTypeFromExpression(expression: ts.Expression, sourceFile: ts.SourceFile): SchemaField['type'] {
    const node = unwrapExpressionNode(expression)

    if (ts.isCallExpression(node)) {
        return inferTypeFromCallExpression(node, sourceFile)
    }

    if (ts.isObjectLiteralExpression(node)) return 'object'
    if (ts.isArrayLiteralExpression(node)) return 'array'
    if (ts.isNumericLiteral(node)) return 'number'
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
        return 'boolean'
    }

    const text = node.getText(sourceFile)
    if (/z\.(array|tuple)|\.array\(/.test(text)) return 'array'
    if (/z\.(coerce\.)?number|\.int\(/.test(text)) return 'number'
    if (/z\.(coerce\.)?boolean/.test(text)) return 'boolean'
    if (/z\.(date|coerce\.date)|datetime|dateTime/.test(text)) return 'string'
    if (/z\.(enum|literal)/.test(text)) return 'string'
    if (/z\.(object|record|map)/.test(text)) return 'object'
    return 'string'
}

function isOptionalZodExpression(expression: ts.Expression): boolean {
    const node = unwrapExpressionNode(expression)

    if (!ts.isCallExpression(node)) return false

    const expr = node.expression
    if (ts.isPropertyAccessExpression(expr)) {
        const methodName = expr.name.text
        if (methodName === 'optional' || methodName === 'nullish') return true
        return isOptionalZodExpression(expr.expression)
    }

    if (ts.isIdentifier(expr) && expr.text === 'optional') return true

    return false
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
    schemaKey: string,
    options?: { methods?: MethodEntry[] }
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

        const enumValues = extractEnumValuesFromExpression(prop.initializer, sourceFile)
        const format = inferFieldFormatFromExpression(prop.initializer, name, sourceFile)
        const lookup = options?.methods
            ? buildLookupSpecForField(name, prop.initializer, sourceFile, options.methods)
            : undefined

        fields[name] = {
            type: inferFieldTypeFromExpression(prop.initializer, sourceFile),
            optional: isOptionalZodExpression(prop.initializer),
            ...(enumValues ? { enumValues } : {}),
            ...(format ? { format } : {}),
            ...(lookup ? { lookup } : {}),
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

    const methods: MethodEntry[] = []
    let txCounter = 1

    for (const boFile of boFiles) {
        const boContent = fs.readFileSync(boFile, 'utf-8')
        const methodInfos = extractMethodsFromBoSource(boContent)
        if (methodInfos.length === 0) continue

        const boDirname = path.dirname(boFile)
        const boBaseName = path.basename(boFile, '.ts').replace('BO', '')
        const schemasPath = path.join(boDirname, `${boBaseName}Schemas.ts`)
        const schemaContent = fs.existsSync(schemasPath) ? fs.readFileSync(schemasPath, 'utf-8') : ''

        for (const method of methodInfos) {
            const tx = resolveTxNumber(txMap, method.className, method.methodName, txCounter)
            txCounter += 1

            methods.push({
                ...method,
                tx,
                boFile,
                schemaContent,
            })
        }
    }

    const specs: TxSpec[] = []

    for (const method of methods) {
        const payloadSchema = method.schemaContent
            ? extractSchemaFieldsFromSource(method.schemaContent, method.schemaKey, {
                  methods,
              })
            : {}

        specs.push({
            tx: method.tx,
            name: `${method.className}.${method.methodName}`,
            description: `Auto-generado de ${path.basename(method.boFile)}`,
            payloadSchema,
        })
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
