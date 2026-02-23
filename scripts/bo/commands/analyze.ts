import { Context } from '../core/ctx.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseMethodsFromBO } from '../templates/bo.js'
import colors from 'colors'

interface AnalysisResult {
    name: string
    status: 'ok' | 'warning' | 'error'
    files: FileCheck[]
    methods: string[]
    issues: string[]
    suggestions: string[]
}

interface FileCheck {
    name: string
    exists: boolean
    size?: number
}

const EXPECTED_FILES = [
    { pattern: '{Name}BO.ts', required: true },
    { pattern: '{Name}Service.ts', required: false },
    { pattern: '{Name}Repository.ts', required: false },
    { pattern: '{Name}Queries.ts', required: false },
    { pattern: '{Name}Schemas.ts', required: true },
    { pattern: '{Name}Types.ts', required: false },
    { pattern: '{Name}Messages.ts', required: false },
    { pattern: '{Name}Errors.ts', required: false },
    { pattern: '{Name}Module.ts', required: false },
]

/**
 * Analyze command - health check for BOs
 */
export class AnalyzeCommand {
    constructor(private ctx: Context) {}

    async run(objectName?: string) {
        const { Interactor } = await import('../interactor/ui.js')
        const ui = new Interactor()

        ui.divider()
        ui.info('🔍 BO Health Analyzer')

        if (objectName) {
            await this.analyzeOne(objectName, ui)
        } else {
            await this.analyzeAll(ui)
        }
    }

    private async analyzeOne(objectName: string, ui: any) {
        const result = await this.analyze(objectName)
        this.printResult(result, ui)
    }

    private async analyzeAll(ui: any) {
        const boRoot = path.join(this.ctx.config.rootDir, 'BO')
        const bos: string[] = []

        try {
            const entries = await fs.readdir(boRoot, { withFileTypes: true })
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    bos.push(entry.name)
                }
            }
        } catch {
            ui.warn(`BO directory not found. Run: pnpm run bo new <Name>`)
            return
        }

        if (bos.length === 0) {
            ui.info(`No BOs found. Run: pnpm run bo new <Name>`)
            return
        }

        ui.startSpinner(`Analyzing ${bos.length} Business Objects...`)

        let okCount = 0
        let warnCount = 0
        let errorCount = 0
        
        const summaryRows: string[][] = []

        for (const bo of bos) {
            const result = await this.analyze(bo)

            const icon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
            const fileCount = result.files.filter((f) => f.exists).length
            const methodCount = result.methods.length

            summaryRows.push([
                 icon,
                 result.name,
                 `${fileCount}/9 files`,
                 `${methodCount} methods`
            ])

            if (result.status === 'ok') okCount++
            else if (result.status === 'warning') warnCount++
            else errorCount++
        }

        ui.stopSpinner(true)
        ui.table(['Status', 'BO', 'Files Found', 'Methods'], summaryRows)

        ui.divider()
        ui.info(`✅ OK: ${okCount}   ⚠️ Warnings: ${warnCount}   ❌ Errors: ${errorCount}`)

        if (warnCount > 0 || errorCount > 0) {
            ui.info(`Run ${colors.bold('pnpm run bo analyze <Name>')} for details`)
        }
    }

    private async analyze(objectName: string): Promise<AnalysisResult> {
        const boDir = path.join(this.ctx.config.rootDir, 'BO', objectName)
        const issues: string[] = []
        const suggestions: string[] = []
        const files: FileCheck[] = []
        let methods: string[] = []

        // Check directory exists
        try {
            await fs.access(boDir)
        } catch {
            return {
                name: objectName,
                status: 'error',
                files: [],
                methods: [],
                issues: [`Directory BO/${objectName}/ not found`],
                suggestions: [`Run: pnpm run bo new ${objectName}`],
            }
        }

        // Check files
        for (const expected of EXPECTED_FILES) {
            const fileName = expected.pattern.replace('{Name}', objectName)
            const filePath = path.join(boDir, fileName)

            try {
                const stat = await fs.stat(filePath)
                files.push({ name: fileName, exists: true, size: stat.size })

                // Parse methods from BO file
                if (fileName.endsWith('BO.ts')) {
                    const content = await fs.readFile(filePath, 'utf-8')
                    methods = parseMethodsFromBO(content)
                }
            } catch {
                files.push({ name: fileName, exists: false })

                if (expected.required) {
                    issues.push(`Missing required file: ${fileName}`)
                } else {
                    suggestions.push(`Add ${fileName} for better organization`)
                }
            }
        }

        // Check for common issues
        const boFile = files.find((f) => f.name.endsWith('BO.ts'))
        if (boFile?.exists && boFile.size && boFile.size < 200) {
            issues.push('BO file seems too small - may be incomplete')
        }

        if (methods.length === 0 && boFile?.exists) {
            issues.push('No public async methods found in BO')
            suggestions.push('Add methods like get, create, update, delete')
        }

        // Check for types file content
        const typesFile = files.find((f) => f.name.endsWith('Types.ts'))
        if (typesFile?.exists) {
            const typesContent = await fs.readFile(path.join(boDir, typesFile.name), 'utf-8')
            if (typesContent.includes('TODO')) {
                suggestions.push(`${typesFile.name} has TODO items to complete`)
            }
        }

        // Check for messages file content
        const messagesFile = files.find((f) => f.name.endsWith('Messages.ts'))
        if (messagesFile?.exists) {
            const messagesContent = await fs.readFile(path.join(boDir, messagesFile.name), 'utf-8')
            if (!messagesContent.includes('NOT_FOUND')) {
                suggestions.push(`Consider adding NOT_FOUND message to ${messagesFile.name}`)
            }
        }

        // Check for errors file
        const errorsFile = files.find((f) => f.name.endsWith('Errors.ts'))
        if (!errorsFile?.exists && methods.length > 2) {
            suggestions.push(`Consider adding ${objectName}Errors.ts for better error handling`)
        }

        // Determine status
        let status: 'ok' | 'warning' | 'error' = 'ok'
        if (issues.length > 0) {
            status = issues.some((i) => i.includes('Missing required')) ? 'error' : 'warning'
        } else if (suggestions.length > 0) {
            status = 'warning'
        }

        return { name: objectName, status, files, methods, issues, suggestions }
    }

    private printResult(result: AnalysisResult, ui: any) {
        const statusStr = result.status === 'ok' ? '✅ OK' : result.status === 'warning' ? '⚠️ Warning' : '❌ Error'
        
        ui.divider()
        ui.info(`Health Check: ${result.name}BO (${statusStr})`)

        // Files
        const fileRows = result.files.map(f => [
            f.exists ? '✅' : '❌',
            f.name,
            f.size ? this.formatSize(f.size) : '---'
        ])
        ui.table(['Status', 'File', 'Size'], fileRows)

        // Methods
        if (result.methods.length > 0) {
            ui.step(`Methods (${result.methods.length}): ${result.methods.join(', ')}`, 'done')
        }

        // Issues
        if (result.issues.length > 0) {
            ui.error('Issues:')
            for (const issue of result.issues) {
                console.log(`   • ${colors.red(issue)}`)
            }
        }

        // Suggestions
        if (result.suggestions.length > 0) {
            ui.warn('Suggestions:')
            for (const suggestion of result.suggestions) {
                console.log(`   • ${colors.yellow(suggestion)}`)
            }
        }

        console.log('')
    }

    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes}B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }
}
