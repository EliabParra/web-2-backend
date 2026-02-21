import * as p from '@clack/prompts'
import 'colors'

export class Interactor {
    constructor() {}

    close() {
        // No-op for clack prompts, as we use `cancel` handles directly
    }

    async header() {
        console.clear()
        p.intro(`${'🚀 ToProccess DB Init CLI'.cyan.bold}`)
        p.note('Initialized your robust, scalable architecture DB', 'Info')
    }

    async ask(question: string, defaultValue?: string): Promise<string> {
        const result = await p.text({
            message: question,
            defaultValue: defaultValue,
            placeholder: defaultValue,
        })
        
        if (p.isCancel(result)) {
            p.cancel('Operation cancelled.')
            process.exit(0)
        }
        
        return result as string
    }

    async confirm(question: string, defaultYes = true): Promise<boolean> {
        const result = await p.confirm({
            message: question,
            initialValue: defaultYes,
        })
        
        if (p.isCancel(result)) {
            p.cancel('Operation cancelled.')
            process.exit(0)
        }
        
        return result as boolean
    }

    async select(question: string, options: string[], defaultOption?: string): Promise<string> {
        const clackOptions = options.map((opt) => ({
            value: opt,
            label: opt,
        }))
        
        let initialValue = clackOptions[0].value
        if (defaultOption) {
            const found = clackOptions.find(opt => opt.value.includes(defaultOption))
            if (found) initialValue = found.value
        }

        const result = await p.select({
            message: question,
            options: clackOptions,
            initialValue,
        })
        
        if (p.isCancel(result)) {
            p.cancel('Operation cancelled.')
            process.exit(0)
        }
        
        return result as string
    }
}
