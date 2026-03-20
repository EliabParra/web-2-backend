import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BO_DIR = path.resolve(__dirname, '../../BO')
const OUTPUT_PATH = path.resolve(__dirname, 'spec.json')

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

function extractMethods(boContent: string): Array<{ methodName: string; inputType: string }> {
    const methods: Array<{ methodName: string; inputType: string }> = []
    const regex = /async\s+(\w+)\s*\(\s*params\s*:\s*Inputs\.(\w+)\s*\)/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(boContent)) !== null) {
        methods.push({ methodName: match[1], inputType: match[2] })
    }
    return methods
}

function inferZodType(chain: string): { type: string; optional: boolean } {
    const optional = chain.includes('.optional()')
    let type = 'string'

    if (chain.includes('z.coerce.number') || chain.includes('z.number')) {
        type = 'number'
    } else if (chain.includes('z.coerce.boolean') || chain.includes('z.boolean')) {
        type = 'boolean'
    } else if (chain.includes('z.email') || chain.includes('.email(')) {
        type = 'string'
    } else if (chain.includes('z.date') || chain.includes('z.coerce.date')) {
        type = 'string'
    } else if (chain.includes('z.array')) {
        type = 'array'
    }

    return { type, optional }
}

function extractSchemaFields(
    schemaContent: string,
    schemaName: string
): Record<string, SchemaField> {
    const fields: Record<string, SchemaField> = {}

    // Match the schema block: `schemaName: z.object({ ... })`
    // We need to handle nested parens/braces, so we do a manual brace-count scan
    const blockStart = schemaContent.indexOf(`${schemaName}: z.object({`)
    if (blockStart === -1) {
        // Try alternate pattern: `schemaName: z.object( {`
        const altStart = schemaContent.indexOf(`${schemaName}: z.object(`)
        if (altStart === -1) return fields
        return extractFieldsFromPosition(schemaContent, altStart, schemaName)
    }

    return extractFieldsFromPosition(schemaContent, blockStart, schemaName)
}

function extractFieldsFromPosition(
    content: string,
    startPos: number,
    _schemaName: string
): Record<string, SchemaField> {
    const fields: Record<string, SchemaField> = {}

    // Find the opening `{` of z.object({
    const objStart = content.indexOf('{', content.indexOf('z.object(', startPos))
    if (objStart === -1) return fields

    // Count braces to find matching close
    let depth = 1
    let pos = objStart + 1
    while (pos < content.length && depth > 0) {
        if (content[pos] === '{') depth++
        else if (content[pos] === '}') depth--
        pos++
    }

    const objectBody = content.slice(objStart + 1, pos - 1)

    // Extract fields: `fieldName: z.something(...)`
    const fieldRegex = /(\w+)\s*:\s*(z\.[^,\n}]+(?:\([^)]*\))*[^,\n}]*)/g
    let match: RegExpExecArray | null
    while ((match = fieldRegex.exec(objectBody)) !== null) {
        const fieldName = match[1]
        const zodChain = match[2]
        // Skip comments
        if (fieldName === 'TODO' || fieldName === 'export') continue
        fields[fieldName] = inferZodType(zodChain)
    }

    return fields
}

function resolveSchemaName(methodName: string, boContent: string): string | null {
    // Look for pattern: `XxxSchemas.schemaKeyName` used in the method's this.exec call
    // Pattern: schemas reference inside the method body
    const methodRegex = new RegExp(
        `async\\s+${methodName}\\s*\\([^)]*\\)[^{]*\\{[\\s\\S]*?\\w+Schemas\\.(\\w+)`,
        'm'
    )
    const match = methodRegex.exec(boContent)
    return match?.[1] ?? null
}

function getClassName(boContent: string): string | null {
    const match = /export\s+class\s+(\w+)\s+extends\s+BaseBO/.exec(boContent)
    return match?.[1] ?? null
}

function main(): void {
    console.log('🔍 Escaneando Business Objects...\n')

    if (!fs.existsSync(BO_DIR)) {
        console.error(`❌ Directorio BO no encontrado: ${BO_DIR}`)
        process.exit(1)
    }

    const boFiles = findBOFiles(BO_DIR)
    console.log(`   Encontrados ${boFiles.length} archivo(s) BO:\n`)

    const specs: TxSpec[] = []
    let txCounter = 1

    for (const boFile of boFiles) {
        const boContent = fs.readFileSync(boFile, 'utf-8')
        const className = getClassName(boContent)
        if (!className) continue

        const boDir = path.dirname(boFile)
        const boBaseName = path.basename(boFile, '.ts').replace('BO', '')
        const schemasPath = path.join(boDir, `${boBaseName}Schemas.ts`)

        console.log(`   📄 ${className} (${path.relative(BO_DIR, boFile)})`)

        let schemaContent = ''
        if (fs.existsSync(schemasPath)) {
            schemaContent = fs.readFileSync(schemasPath, 'utf-8')
        } else {
            console.log(`      ⚠️  Schemas no encontrado: ${path.basename(schemasPath)}`)
        }

        const methods = extractMethods(boContent)
        for (const { methodName } of methods) {
            const schemaKey = resolveSchemaName(methodName, boContent) ?? methodName
            const payloadSchema = schemaContent
                ? extractSchemaFields(schemaContent, schemaKey)
                : {}

            specs.push({
                tx: txCounter++,
                name: `${className}.${methodName}`,
                description: `Auto-generado de ${path.basename(boFile)}`,
                payloadSchema,
            })

            const fieldCount = Object.keys(payloadSchema).length
            console.log(`      ✅ ${methodName} → schema "${schemaKey}" (${fieldCount} campos)`)
        }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(specs, null, 2), 'utf-8')
    console.log(`\n✨ Generado: ${OUTPUT_PATH}`)
    console.log(`   Total transacciones: ${specs.length}\n`)
}

main()
