import * as p from '@clack/prompts'
import colors from 'colors'
import Table from 'cli-table3'

/**
 * Interactive UI for BO CLI
 * Provides beautiful console output and user prompts using @clack/prompts and cli-table3
 */
export class Interactor {
    private spinner?: ReturnType<typeof p.spinner>

    constructor() {}

    close() {
        process.exit(0)
    }

    // ============================================================
    // Headers & Dividers
    // ============================================================

    header() {
        console.log('')
        p.intro(colors.cyan(colors.bold('📦 ToProccess BO CLI')))
    }

    divider() {
        console.log(colors.gray('──────────────────────────────────────────────────'))
    }

    // ============================================================
    // Input Methods
    // ============================================================

    async ask(question: string, defaultValue?: string): Promise<string> {
        const ans = await p.text({
            message: question,
            defaultValue: defaultValue,
            placeholder: defaultValue,
        })
        if (p.isCancel(ans)) {
            p.cancel('Operación cancelada.')
            process.exit(0)
        }
        return ans as string
    }

    async confirm(question: string, defaultYes = true): Promise<boolean> {
        const ans = await p.confirm({
            message: question,
            initialValue: defaultYes,
        })
        if (p.isCancel(ans)) {
            p.cancel('Operación cancelada.')
            process.exit(0)
        }
        return ans as boolean
    }

    async select(question: string, options: string[] | { label: string; value: string }[], defaultOption?: string): Promise<string> {
        // Map string[] to object array if needed
        const formattedOptions = options.map((opt) => {
            if (typeof opt === 'string') return { label: opt, value: opt }
            return opt
        })

        const ans = await p.select({
            message: question,
            options: formattedOptions,
            initialValue: defaultOption,
        })
        
        if (p.isCancel(ans)) {
            p.cancel('Operación cancelada.')
            process.exit(0)
        }
        return ans as string
    }

    async multiSelect(
        question: string,
        options: string[] | { label: string; value: string }[],
        defaults: string[] = []
    ): Promise<string[]> {
        const formattedOptions = options.map((opt) => {
            if (typeof opt === 'string') return { label: opt, value: opt }
            return opt
        })

        const ans = await p.multiselect({
            message: question,
            options: formattedOptions,
            initialValues: defaults,
            required: false // Let callers validate if they want to
        })

        if (p.isCancel(ans)) {
            p.cancel('Operación cancelada.')
            process.exit(0)
        }
        return ans as string[]
    }

    // ============================================================
    // Output Methods
    // ============================================================

    success(message: string) {
        p.log.success(colors.green(message))
    }

    error(message: string) {
        p.log.error(colors.red(message))
    }

    warn(message: string) {
        p.log.warn(colors.yellow(message))
    }

    info(message: string) {
        p.log.info(colors.blue(message))
    }

    step(message: string, status: 'pending' | 'done' | 'error' = 'pending') {
        const icon = status === 'done' ? '✅' : status === 'error' ? '❌' : '⏳'
        p.log.step(`${icon} ${message}`)
    }

    // ============================================================
    // Tables
    // ============================================================

    table(headers: string[], rows: string[][]) {
        if (headers.length === 0 && rows.length === 0) return

        const table = new Table({
            head: headers.map(h => colors.gray(h)),
            style: { border: ['gray'] }
        })

        for (const row of rows) {
            table.push(row)
        }

        console.log(table.toString())
    }

    // ============================================================
    // Progress
    // ============================================================

    startSpinner(message: string) {
        this.spinner = p.spinner()
        this.spinner.start(colors.cyan(message))
    }

    stopSpinner(success = true) {
        if (!this.spinner) return
        
        if (success) {
            this.spinner.stop(colors.green('✅ Hecho.'))
        } else {
            this.spinner.stop(colors.red('❌ Error.'))
        }
        this.spinner = undefined
    }
}
