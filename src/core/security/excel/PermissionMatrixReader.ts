import ExcelJS from 'exceljs'
import type { IDatabase, IValidator, ILogger } from '../../../types/core.js'
import type {
    IPermissionMatrixReader,
    ImportResult,
    ImportError,
    SheetSummary,
    ProfileRow,
    UserRow,
    SubsystemRow,
    ObjectRow,
    MethodRow,
    MenuRow,
    OptionRow,
    PermissionRow,
    AssignmentRow,
    ProfileIdRow,
    SubsystemIdRow,
    MenuIdRow,
    MethodIdRow,
    OptionIdRow,
    ProfileMethodIdRow,
    ObjectIdRow,
} from '../../../types/excel.js'
import {
    SHEET_DEFINITIONS,
    ProfileRowSchema,
    UserRowSchema,
    SubsystemRowSchema,
    ObjectRowSchema,
    MethodRowSchema,
    MenuRowSchema,
    OptionRowSchema,
    PermissionRowSchema,
    AssignmentRowSchema,
    ObjectMethodSchema,
} from '../../../types/excel.js'
import { ExcelQueries } from './ExcelQueries.js'

/**
 * Lector e importador de archivos Excel para la matriz de permisos.
 *
 * Parsea un workbook Excel, valida cada fila con el `IValidator` del framework
 * (mensajes i18n normalizados) y ejecuta inserciones parametrizadas respetando
 * el orden de dependencias:
 * Perfiles → Usuarios → Subsistemas → Objetos → Métodos → Menús → Opciones → Permisos → Asignaciones.
 *
 * Seguridad:
 * - Todas las queries usan parámetros posicionales ($1, $2...) — previene inyección SQL.
 * - Los datos se validan con schemas Zod a través de `IValidator` antes de enviarse a DB.
 * - Los campos `object_method` se validan con regex estricta (`ObjectMethodSchema`).
 *
 * @example
 * ```typescript
 * const reader = new PermissionMatrixReader(db, validator, log)
 * const result = await reader.import(excelBuffer)
 * if (!result.success) console.log(result.errors)
 * ```
 */
export class PermissionMatrixReader implements IPermissionMatrixReader {
    private db: IDatabase
    private validator: IValidator
    private log: ILogger
    private errors: ImportError[] = []
    private summaries: SheetSummary[] = []

    /**
     * Crea una instancia del lector de Excel.
     *
     * @param db - Servicio de base de datos para inserciones
     * @param validator - Validador del framework (Zod + i18n)
     * @param log - Logger para registrar eventos de importación
     */
    constructor(db: IDatabase, validator: IValidator, log: ILogger) {
        this.db = db
        this.validator = validator
        this.log = log.child({ module: 'PermissionMatrixReader' })
    }

    /**
     * Importa datos desde un buffer Excel a la base de datos.
     * Procesa las hojas en orden de dependencias.
     *
     * @param buffer - Buffer del archivo Excel
     * @returns Resultado de la importación con resumen y errores
     */
    async import(buffer: Buffer): Promise<ImportResult> {
        this.errors = []
        this.summaries = []

        this.log.trace('Iniciando importación de matriz de permisos desde Excel')

        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(Buffer.from(buffer) as never)

        await this.processProfiles(workbook)
        await this.processUsers(workbook)
        await this.processSubsystems(workbook)
        await this.processObjects(workbook)
        await this.processMethods(workbook)
        await this.processMenus(workbook)
        await this.processOptions(workbook)
        await this.processPermissions(workbook)
        await this.processAssignments(workbook)

        const result: ImportResult = {
            success: this.errors.length === 0,
            summary: this.summaries,
            errors: this.errors,
        }

        if (result.success) {
            this.log.trace('Importación Excel completada sin errores', {
                sheets: result.summary.length,
                totalInserted: result.summary.reduce((acc, s) => acc + s.inserted, 0),
            })
        } else {
            this.log.warn(`Importación Excel completada con ${result.errors.length} errores`, {
                errorCount: result.errors.length,
                summary: result.summary,
            })
        }

        return result
    }

    // ═══════════════════════════════════════════════════════════════════
    // Procesadores por hoja
    // ═══════════════════════════════════════════════════════════════════

    /** Procesa la hoja Perfiles. */
    private async processProfiles(workbook: ExcelJS.Workbook): Promise<void> {
        const rows = this.readSheet(workbook, SHEET_DEFINITIONS.PROFILES.name, [...SHEET_DEFINITIONS.PROFILES.columns])
        if (!rows) return

        let inserted = 0
        let skipped = 0

        for (const { row, data } of rows) {
            const parsed = this.validateRow<ProfileRow>(ProfileRowSchema, data, SHEET_DEFINITIONS.PROFILES.name, row)
            if (!parsed) continue

            try {
                const res = await this.db.query<ProfileIdRow>(ExcelQueries.INSERT_PROFILE, [parsed.profile_name])
                if (res.rows.length > 0) {
                    inserted++
                    this.log.debug(`Perfil creado: "${parsed.profile_name}"`)
                } else {
                    skipped++
                }
            } catch (err) {
                this.addError(SHEET_DEFINITIONS.PROFILES.name, row, 'profile_name', this.errorMessage(err))
            }
        }

        this.addSummary(SHEET_DEFINITIONS.PROFILES.name, rows.length, inserted, skipped)
    }

    /** Procesa la hoja Usuarios con hash bcrypt. */
    private async processUsers(workbook: ExcelJS.Workbook): Promise<void> {
        const rows = this.readSheet(workbook, SHEET_DEFINITIONS.USERS.name, [...SHEET_DEFINITIONS.USERS.columns])
        if (!rows) return

        let inserted = 0
        let skipped = 0

        for (const { row, data } of rows) {
            const parsed = this.validateRow<UserRow>(UserRowSchema, data, SHEET_DEFINITIONS.USERS.name, row)
            if (!parsed) continue

            try {
                const profileRes = await this.db.query<ProfileIdRow>(
                    ExcelQueries.FIND_PROFILE_BY_NAME, [parsed.profile_name]
                )

                if (profileRes.rows.length === 0) {
                    this.addError(SHEET_DEFINITIONS.USERS.name, row, 'profile_name', `Perfil "${parsed.profile_name}" no existe`)
                    continue
                }

                const bcrypt = await import('bcrypt')
                const hashedPassword = await bcrypt.default.hash(parsed.password, 10)

                const res = await this.db.query<{ [key: string]: unknown; user_id: number }>(
                    ExcelQueries.INSERT_USER, [parsed.username, hashedPassword, profileRes.rows[0].profile_id]
                )
                if (res.rows.length > 0) {
                    inserted++
                    this.log.debug(`Usuario creado: "${parsed.username}" → perfil "${parsed.profile_name}"`)
                } else {
                    skipped++
                }
            } catch (err) {
                this.addError(SHEET_DEFINITIONS.USERS.name, row, 'username', this.errorMessage(err))
            }
        }

        this.addSummary(SHEET_DEFINITIONS.USERS.name, rows.length, inserted, skipped)
    }

    /** Procesa la hoja Subsistemas. */
    private async processSubsystems(workbook: ExcelJS.Workbook): Promise<void> {
        const rows = this.readSheet(workbook, SHEET_DEFINITIONS.SUBSYSTEMS.name, [...SHEET_DEFINITIONS.SUBSYSTEMS.columns])
        if (!rows) return

        let inserted = 0
        let skipped = 0

        for (const { row, data } of rows) {
            const parsed = this.validateRow<SubsystemRow>(SubsystemRowSchema, data, SHEET_DEFINITIONS.SUBSYSTEMS.name, row)
            if (!parsed) continue

            try {
                const res = await this.db.query<SubsystemIdRow>(ExcelQueries.INSERT_SUBSYSTEM, [parsed.subsystem_name])
                if (res.rows.length > 0) {
                    inserted++
                    this.log.debug(`Subsistema creado: "${parsed.subsystem_name}"`)
                } else {
                    skipped++
                }
            } catch (err) {
                this.addError(SHEET_DEFINITIONS.SUBSYSTEMS.name, row, 'subsystem_name', this.errorMessage(err))
            }
        }

        this.addSummary(SHEET_DEFINITIONS.SUBSYSTEMS.name, rows.length, inserted, skipped)
    }

    /** Procesa la hoja Objetos (BOs). */
    private async processObjects(workbook: ExcelJS.Workbook): Promise<void> {
        const rows = this.readSheet(workbook, SHEET_DEFINITIONS.OBJECTS.name, [...SHEET_DEFINITIONS.OBJECTS.columns])
        if (!rows) return

        let inserted = 0
        let skipped = 0

        for (const { row, data } of rows) {
            const parsed = this.validateRow<ObjectRow>(ObjectRowSchema, data, SHEET_DEFINITIONS.OBJECTS.name, row)
            if (!parsed) continue

            try {
                const res = await this.db.query<ObjectIdRow>(ExcelQueries.INSERT_OBJECT, [parsed.object_name])
                if (res.rows.length > 0) {
                    inserted++
                    this.log.debug(`Objeto creado: "${parsed.object_name}"`)
                } else {
                    skipped++
                }
            } catch (err) {
                this.addError(SHEET_DEFINITIONS.OBJECTS.name, row, 'object_name', this.errorMessage(err))
            }
        }

        this.addSummary(SHEET_DEFINITIONS.OBJECTS.name, rows.length, inserted, skipped)
    }

    /** Procesa la hoja Métodos y crea links object_method + transaction. */
    private async processMethods(workbook: ExcelJS.Workbook): Promise<void> {
        const rows = this.readSheet(workbook, SHEET_DEFINITIONS.METHODS.name, [...SHEET_DEFINITIONS.METHODS.columns])
        if (!rows) return

        let inserted = 0
        let skipped = 0

        // Obtener próximo número de transacción disponible
        const txRes = await this.db.query<{ [key: string]: unknown; next_tx: number }>(ExcelQueries.SELECT_NEXT_TX)
        let nextTx = Number(txRes.rows[0]?.next_tx) || 1

        for (const { row, data } of rows) {
            const parsed = this.validateRow<MethodRow>(MethodRowSchema, data, SHEET_DEFINITIONS.METHODS.name, row)
            if (!parsed) continue

            try {
                // Resolver object_id
                const objRes = await this.db.query<ObjectIdRow>(ExcelQueries.FIND_OBJECT_BY_NAME, [parsed.object_name])
                if (objRes.rows.length === 0) {
                    this.addError(SHEET_DEFINITIONS.METHODS.name, row, 'object_name', `Objeto "${parsed.object_name}" no existe`)
                    continue
                }

                // Insertar o encontrar method
                const metInsert = await this.db.query<MethodIdRow>(ExcelQueries.INSERT_METHOD, [parsed.method_name])
                let methodId: number

                if (metInsert.rows.length > 0) {
                    methodId = metInsert.rows[0].method_id
                } else {
                    const metFind = await this.db.query<MethodIdRow>(ExcelQueries.FIND_METHOD_BY_NAME, [parsed.method_name])
                    if (metFind.rows.length === 0) {
                        this.addError(SHEET_DEFINITIONS.METHODS.name, row, 'method_name', `No se pudo resolver method_id para "${parsed.method_name}"`)
                        continue
                    }
                    methodId = metFind.rows[0].method_id
                }

                // Crear link object_method
                await this.db.query(ExcelQueries.INSERT_OBJECT_METHOD, [objRes.rows[0].object_id, methodId])

                // Crear transacción
                await this.db.query(ExcelQueries.INSERT_TRANSACTION, [String(nextTx), methodId, objRes.rows[0].object_id])
                nextTx++

                inserted++
                this.log.debug(`Método registrado: "${parsed.object_name}.${parsed.method_name}"`)
            } catch (err) {
                this.addError(SHEET_DEFINITIONS.METHODS.name, row, 'method_name', this.errorMessage(err))
            }
        }

        this.addSummary(SHEET_DEFINITIONS.METHODS.name, rows.length, inserted, skipped)
    }

    /** Procesa la hoja Menús con resolución de FK por subsistema. */
    private async processMenus(workbook: ExcelJS.Workbook): Promise<void> {
        const rows = this.readSheet(workbook, SHEET_DEFINITIONS.MENUS.name, [...SHEET_DEFINITIONS.MENUS.columns])
        if (!rows) return

        let inserted = 0
        let skipped = 0

        for (const { row, data } of rows) {
            const parsed = this.validateRow<MenuRow>(MenuRowSchema, data, SHEET_DEFINITIONS.MENUS.name, row)
            if (!parsed) continue

            try {
                const subRes = await this.db.query<SubsystemIdRow>(
                    ExcelQueries.FIND_SUBSYSTEM_BY_NAME, [parsed.subsystem_name]
                )

                if (subRes.rows.length === 0) {
                    this.addError(SHEET_DEFINITIONS.MENUS.name, row, 'subsystem_name', `Subsistema "${parsed.subsystem_name}" no existe`)
                    continue
                }

                const res = await this.db.query<MenuIdRow>(
                    ExcelQueries.INSERT_MENU, [parsed.menu_name, subRes.rows[0].subsystem_id]
                )
                if (res.rows.length > 0) {
                    inserted++
                    this.log.debug(`Menú creado: "${parsed.menu_name}" → subsistema "${parsed.subsystem_name}"`)
                } else {
                    skipped++
                }
            } catch (err) {
                this.addError(SHEET_DEFINITIONS.MENUS.name, row, 'menu_name', this.errorMessage(err))
            }
        }

        this.addSummary(SHEET_DEFINITIONS.MENUS.name, rows.length, inserted, skipped)
    }

    /** Procesa la hoja Opciones con resolución de method_id. */
    private async processOptions(workbook: ExcelJS.Workbook): Promise<void> {
        const rows = this.readSheet(workbook, SHEET_DEFINITIONS.OPTIONS.name, [...SHEET_DEFINITIONS.OPTIONS.columns])
        if (!rows) return

        let inserted = 0
        let skipped = 0

        for (const { row, data } of rows) {
            const parsed = this.validateRow<OptionRow>(OptionRowSchema, data, SHEET_DEFINITIONS.OPTIONS.name, row)
            if (!parsed) continue

            try {
                let methodId: number | null = null

                if (parsed.object_method) {
                    const omResult = this.validator.validate<string>(parsed.object_method, ObjectMethodSchema)
                    if (!omResult.valid) {
                        for (const err of omResult.errors) {
                            this.addError(SHEET_DEFINITIONS.OPTIONS.name, row, 'object_method', err.message)
                        }
                        continue
                    }

                    const [objectName, methodName] = parsed.object_method.split('.')
                    const metRes = await this.db.query<MethodIdRow>(
                        ExcelQueries.FIND_METHOD_BY_OBJECT_METHOD, [objectName, methodName]
                    )

                    if (metRes.rows.length > 0) {
                        methodId = metRes.rows[0].method_id
                    } else {
                        this.addError(SHEET_DEFINITIONS.OPTIONS.name, row, 'object_method', `Método "${parsed.object_method}" no encontrado`)
                        continue
                    }
                }

                const optRes = await this.db.query<OptionIdRow>(
                    ExcelQueries.INSERT_OPTION, [parsed.option_name, methodId]
                )

                if (optRes.rows.length > 0) {
                    inserted++
                    this.log.debug(`Opción creada: "${parsed.option_name}"`)
                    if (parsed.menu_name) {
                        const menuRes = await this.db.query<MenuIdRow>(
                            ExcelQueries.FIND_MENU_BY_NAME, [parsed.menu_name]
                        )
                        if (menuRes.rows.length > 0) {
                            await this.db.query(
                                ExcelQueries.INSERT_MENU_OPTION, [menuRes.rows[0].menu_id, optRes.rows[0].option_id]
                            )
                        }
                    }
                } else {
                    skipped++
                }
            } catch (err) {
                this.addError(SHEET_DEFINITIONS.OPTIONS.name, row, 'option_name', this.errorMessage(err))
            }
        }

        this.addSummary(SHEET_DEFINITIONS.OPTIONS.name, rows.length, inserted, skipped)
    }

    /** Procesa la hoja Permisos con validación de formato object_method. */
    private async processPermissions(workbook: ExcelJS.Workbook): Promise<void> {
        const rows = this.readSheet(workbook, SHEET_DEFINITIONS.PERMISSIONS.name, [...SHEET_DEFINITIONS.PERMISSIONS.columns])
        if (!rows) return

        let inserted = 0
        let skipped = 0

        for (const { row, data } of rows) {
            const parsed = this.validateRow<PermissionRow>(PermissionRowSchema, data, SHEET_DEFINITIONS.PERMISSIONS.name, row)
            if (!parsed) continue

            const [objectName, methodName] = parsed.object_method.split('.')

            try {
                const res = await this.db.query<ProfileMethodIdRow>(
                    ExcelQueries.INSERT_PERMISSION, [parsed.profile_name, objectName, methodName]
                )
                if (res.rows.length > 0) {
                    inserted++
                    this.log.debug(`Permiso asignado: "${parsed.profile_name}" → "${parsed.object_method}"`)
                } else {
                    skipped++
                }
            } catch (err) {
                this.addError(SHEET_DEFINITIONS.PERMISSIONS.name, row, 'object_method', this.errorMessage(err))
            }
        }

        this.addSummary(SHEET_DEFINITIONS.PERMISSIONS.name, rows.length, inserted, skipped)
    }

    /** Procesa la hoja Asignaciones de visibilidad. */
    private async processAssignments(workbook: ExcelJS.Workbook): Promise<void> {
        const rows = this.readSheet(workbook, SHEET_DEFINITIONS.ASSIGNMENTS.name, [...SHEET_DEFINITIONS.ASSIGNMENTS.columns])
        if (!rows) return

        let inserted = 0
        let skipped = 0

        for (const { row, data } of rows) {
            const parsed = this.validateRow<AssignmentRow>(AssignmentRowSchema, data, SHEET_DEFINITIONS.ASSIGNMENTS.name, row)
            if (!parsed) continue

            try {
                await this.db.query(
                    ExcelQueries.INSERT_PROFILE_SUBSYSTEM, [parsed.profile_name, parsed.subsystem_name]
                )

                if (parsed.menu_name) {
                    await this.db.query(
                        ExcelQueries.INSERT_PROFILE_MENU, [parsed.profile_name, parsed.menu_name, parsed.subsystem_name]
                    )
                }

                if (parsed.option_name) {
                    await this.db.query(
                        ExcelQueries.INSERT_PROFILE_OPTION, [parsed.profile_name, parsed.option_name]
                    )
                }

                inserted++
                this.log.debug(`Asignación: "${parsed.profile_name}" → subsistema "${parsed.subsystem_name}"`)
            } catch (err) {
                this.addError(SHEET_DEFINITIONS.ASSIGNMENTS.name, row, 'profile_name', this.errorMessage(err))
            }
        }

        this.addSummary(SHEET_DEFINITIONS.ASSIGNMENTS.name, rows.length, inserted, skipped)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Utilidades
    // ═══════════════════════════════════════════════════════════════════

    /** Lee una hoja del workbook y retorna las filas como objetos crudos. */
    private readSheet(
        workbook: ExcelJS.Workbook,
        sheetName: string,
        expectedColumns: string[]
    ): { row: number; data: Record<string, string> }[] | null {
        const sheet = workbook.getWorksheet(sheetName)
        if (!sheet) return null

        const headerRow = sheet.getRow(1)
        const columnMap = new Map<number, string>()

        headerRow.eachCell((cell, colNumber) => {
            const value = String(cell.value || '').trim()
            if (expectedColumns.includes(value)) {
                columnMap.set(colNumber, value)
            }
        })

        for (const expected of expectedColumns) {
            if (![...columnMap.values()].includes(expected)) {
                this.addError(sheetName, 1, expected, `Columna "${expected}" no encontrada en header`)
                return null
            }
        }

        const rows: { row: number; data: Record<string, string> }[] = []

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return

            const data: Record<string, string> = {}
            let hasValue = false

            for (const [colNumber, colName] of columnMap) {
                const cellValue = row.getCell(colNumber).value
                data[colName] = cellValue != null ? String(cellValue).trim() : ''
                if (data[colName]) hasValue = true
            }

            if (hasValue) {
                rows.push({ row: rowNumber, data })
            }
        })

        return rows
    }

    /**
     * Valida una fila usando el `IValidator` del framework.
     * Los errores se normalizan automáticamente con i18n.
     *
     * @returns Datos parseados y validados, o `null` si falla la validación
     */
    private validateRow<T>(
        schema: unknown,
        data: Record<string, string>,
        sheetName: string,
        rowNumber: number
    ): T | null {
        const result = this.validator.validate<T>(data, schema)
        if (result.valid) return result.data

        for (const err of result.errors) {
            this.addError(sheetName, rowNumber, err.path, err.message)
        }
        return null
    }

    /** Agrega un error al acumulador. */
    private addError(sheet: string, row: number, column: string, message: string): void {
        this.errors.push({ sheet, row, column, message })
    }

    /** Agrega un resumen de hoja al acumulador. */
    private addSummary(sheet: string, processed: number, inserted: number, skipped: number): void {
        this.summaries.push({ sheet, processed, inserted, skipped })
    }

    /** Extrae mensaje de error de forma segura. */
    private errorMessage(err: unknown): string {
        return err instanceof Error ? err.message : String(err)
    }
}
