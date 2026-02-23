import ExcelJS from 'exceljs'
import type { IDatabase } from '../../../types/core.js'
import type {
    IPermissionMatrixWriter,
    ProfileNameRow,
    SubsystemNameRow,
    MenuNameRow,
    ObjectMethodRow,
    UserExportRow,
    MenuExportRow,
    OptionExportRow,
    PermissionExportRow,
    AssignmentExportRow,
    ObjectNameExportRow,
    MethodExportRow,
} from '../../../types/excel.js'
import { SHEET_DEFINITIONS } from '../../../types/excel.js'
import { ExcelQueries } from './ExcelQueries.js'

/** Nombres existentes en la DB para validaciones dropdown. */
interface ExistingNames {
    profiles: string[]
    subsystems: string[]
    objects: string[]
    menus: string[]
    objectMethods: string[]
}

/**
 * Generador de archivos Excel para la matriz de permisos de seguridad.
 *
 * Responsable de:
 * - Generar plantillas vacías con headers, estilos y validaciones dropdown.
 * - Exportar datos existentes de la base de datos a un workbook Excel.
 *
 * Todas las consultas DB se ejecutan mediante queries parametrizadas
 * definidas en `ExcelQueries` para prevenir inyección SQL.
 *
 * @example
 * ```typescript
 * const writer = new PermissionMatrixWriter(db)
 * const buffer = await writer.generateTemplate()
 * ```
 */
export class PermissionMatrixWriter implements IPermissionMatrixWriter {
    private db: IDatabase

    constructor(db: IDatabase) {
        this.db = db
    }

    /**
     * Genera una plantilla Excel vacía con headers, estilos y hoja de instrucciones.
     *
     * @returns Buffer del archivo Excel generado
     */
    async generateTemplate(): Promise<Buffer> {
        const workbook = this.createWorkbook()
        this.addInstructionsSheet(workbook)

        const existingData = await this.loadExistingNames()

        this.addSheet(workbook, SHEET_DEFINITIONS.PROFILES, [])
        this.addSheet(workbook, SHEET_DEFINITIONS.USERS, [], existingData)
        this.addSheet(workbook, SHEET_DEFINITIONS.SUBSYSTEMS, [])
        this.addSheet(workbook, SHEET_DEFINITIONS.OBJECTS, [], existingData)
        this.addSheet(workbook, SHEET_DEFINITIONS.METHODS, [], existingData)
        this.addSheet(workbook, SHEET_DEFINITIONS.MENUS, [], existingData)
        this.addSheet(workbook, SHEET_DEFINITIONS.OPTIONS, [], existingData)
        this.addSheet(workbook, SHEET_DEFINITIONS.PERMISSIONS, [], existingData)
        this.addSheet(workbook, SHEET_DEFINITIONS.ASSIGNMENTS, [], existingData)

        return Buffer.from(await workbook.xlsx.writeBuffer())
    }

    /**
     * Exporta todos los datos de seguridad existentes a un workbook Excel.
     *
     * @returns Buffer del archivo Excel con datos
     */
    async exportData(): Promise<Buffer> {
        const workbook = this.createWorkbook()
        const existingData = await this.loadExistingNames()

        const profiles = await this.db.query<ProfileNameRow>(ExcelQueries.SELECT_PROFILES)
        this.addSheet(workbook, SHEET_DEFINITIONS.PROFILES, profiles.rows)

        const users = await this.db.query<UserExportRow>(ExcelQueries.SELECT_USERS)
        this.addSheet(workbook, SHEET_DEFINITIONS.USERS, users.rows, existingData)

        const subsystems = await this.db.query<SubsystemNameRow>(ExcelQueries.SELECT_SUBSYSTEMS)
        this.addSheet(workbook, SHEET_DEFINITIONS.SUBSYSTEMS, subsystems.rows)

        const objects = await this.db.query<ObjectNameExportRow>(ExcelQueries.SELECT_OBJECTS)
        this.addSheet(workbook, SHEET_DEFINITIONS.OBJECTS, objects.rows, existingData)

        const methods = await this.db.query<MethodExportRow>(ExcelQueries.SELECT_METHODS_EXPORT)
        this.addSheet(workbook, SHEET_DEFINITIONS.METHODS, methods.rows, existingData)

        const menus = await this.db.query<MenuExportRow>(ExcelQueries.SELECT_MENUS)
        this.addSheet(workbook, SHEET_DEFINITIONS.MENUS, menus.rows, existingData)

        const options = await this.db.query<OptionExportRow>(ExcelQueries.SELECT_OPTIONS)
        this.addSheet(workbook, SHEET_DEFINITIONS.OPTIONS, options.rows, existingData)

        const permissions = await this.db.query<PermissionExportRow>(ExcelQueries.SELECT_PERMISSIONS)
        this.addSheet(workbook, SHEET_DEFINITIONS.PERMISSIONS, permissions.rows, existingData)

        const assignments = await this.db.query<AssignmentExportRow>(ExcelQueries.SELECT_ASSIGNMENTS)
        this.addSheet(workbook, SHEET_DEFINITIONS.ASSIGNMENTS, assignments.rows, existingData)

        return Buffer.from(await workbook.xlsx.writeBuffer())
    }

    // ═══════════════════════════════════════════════════════════════════
    // Métodos privados
    // ═══════════════════════════════════════════════════════════════════

    /** Crea un workbook con metadata base. */
    private createWorkbook(): ExcelJS.Workbook {
        const workbook = new ExcelJS.Workbook()
        workbook.creator = 'ToProc Security Framework'
        workbook.created = new Date()
        return workbook
    }

    /** Carga nombres existentes para validaciones dropdown. */
    private async loadExistingNames(): Promise<ExistingNames> {
        const [profiles, subsystems, objects, menus, objectMethods] = await Promise.all([
            this.db.query<ProfileNameRow>(ExcelQueries.SELECT_PROFILES),
            this.db.query<SubsystemNameRow>(ExcelQueries.SELECT_SUBSYSTEMS),
            this.db.query<ObjectNameExportRow>(ExcelQueries.SELECT_OBJECTS),
            this.db.query<MenuNameRow>(ExcelQueries.SELECT_MENU_NAMES),
            this.db.query<ObjectMethodRow>(ExcelQueries.SELECT_OBJECT_METHODS),
        ])

        return {
            profiles: profiles.rows.map((r) => r.profile_name),
            subsystems: subsystems.rows.map((r) => r.subsystem_name),
            objects: objects.rows.map((r) => r.object_name),
            menus: menus.rows.map((r) => r.menu_name),
            objectMethods: objectMethods.rows.map((r) => r.object_method),
        }
    }

    /** Agrega una hoja con headers estilizados, datos y validaciones. */
    private addSheet<T extends Record<string, unknown>>(
        workbook: ExcelJS.Workbook,
        definition: { name: string; columns: readonly string[] },
        data: T[],
        existingNames?: ExistingNames
    ): void {
        const sheet = workbook.addWorksheet(definition.name)
        const columns = [...definition.columns]

        sheet.columns = columns.map((col) => ({
            header: col,
            key: col,
            width: Math.max(col.length + 5, 20),
        }))

        // Header: azul oscuro + texto blanco + bordes
        const headerRow = sheet.getRow(1)
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1A237E' },
            }
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'medium' },
                right: { style: 'thin' },
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })
        headerRow.height = 25

        for (const row of data) {
            const values: Record<string, unknown> = {}
            for (const col of columns) {
                values[col] = row[col] ?? ''
            }
            sheet.addRow(values)
        }

        if (existingNames) {
            this.applyValidations(sheet, columns, existingNames)
        }

        if (columns.length > 0) {
            sheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: columns.length },
            }
        }
    }

    /** Aplica validaciones de lista (dropdown) a las columnas correspondientes. */
    private applyValidations(
        sheet: ExcelJS.Worksheet,
        columns: string[],
        names: ExistingNames
    ): void {
        const maxRow = 200
        const validationMap: Record<string, string[]> = {
            profile_name: names.profiles,
            subsystem_name: names.subsystems,
            object_name: names.objects,
            menu_name: names.menus,
            object_method: names.objectMethods,
        }

        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
            const col = columns[colIdx]
            const list = validationMap[col]
            if (!list || list.length === 0) continue

            for (let row = 2; row <= maxRow; row++) {
                sheet.getCell(row, colIdx + 1).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`"${list.join(',')}"`],
                    showErrorMessage: true,
                    errorTitle: 'Valor inválido',
                    error: `Seleccione un valor de la lista para ${col}`,
                }
            }
        }
    }

    /** Agrega hoja de instrucciones al workbook. */
    private addInstructionsSheet(workbook: ExcelJS.Workbook): void {
        const sheet = workbook.addWorksheet('Instrucciones')
        sheet.getColumn(1).width = 50

        const titleCell = sheet.getCell('A1')
        titleCell.value = 'Matriz de Permisos — Instrucciones'
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF1A237E' } }

        const instructions = [
            '',
            '1. Llene cada hoja en orden (Perfiles → Usuarios → Subsistemas → Objetos → Métodos → Menús → Opciones → Permisos → Asignaciones).',
            '2. Los campos con dropdown muestran valores existentes en la base de datos.',
            '3. Los valores deben coincidir exactamente (sensible a mayúsculas/minúsculas).',
            '4. En "object_method", use el formato: NombreObjeto.nombreMetodo (ej: Auth.login).',
            '5. En "password", ingrese la contraseña en texto plano — será hasheada al importar.',
            '6. Las filas vacías se ignoran, los duplicados se omiten automáticamente.',
            '',
            'Generado por: ToProc Security Framework',
            `Fecha: ${new Date().toISOString()}`,
        ]

        instructions.forEach((text, idx) => {
            const cell = sheet.getCell(`A${idx + 2}`)
            cell.value = text
            if (text.startsWith('Generado') || text.startsWith('Fecha')) {
                cell.font = { italic: true, color: { argb: 'FF888888' } }
            }
        })
    }
}
