import { Context } from '../core/ctx.js'

export class ListCommand {
    constructor(private ctx: Context) {}

    async run() {
        const { Interactor } = await import('../interactor/ui.js')
        const ui = new Interactor()
        
        ui.header()
        ui.info('Listing registered Business Objects (DB)...')
        await this.ctx.ensureGlobals()

        const res = await this.ctx.db.exeRaw(
            `SELECT o.object_id, o.object_name, COUNT(om.method_id) as methods
             FROM security.objects o
             LEFT JOIN security.object_method om ON o.object_id = om.object_id
             GROUP BY o.object_id, o.object_name
             ORDER BY o.object_name`
        )
        const objects = res.rows || []

        if (objects.length > 0) {
            const rows: string[][] = objects.map((obj: any) => [
                String(obj.object_id),
                obj.object_name,
                String(obj.methods)
            ])
            ui.table(['ID', 'Business Object', 'Methods'], rows)
            ui.success(`Found ${objects.length} registered BOs.`)
        } else {
            ui.warn('No Business Objects found in the database.')
        }
    }
}
