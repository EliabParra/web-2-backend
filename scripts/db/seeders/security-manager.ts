import { Database } from '../core/db.js'
import * as p from '@clack/prompts'
import bcrypt from 'bcrypt'
import colors from 'colors'
import { readFileSync, writeFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import Table from 'cli-table3'
import { ZodType } from 'zod'
import { PermissionMatrixWriter } from '../../../src/core/security/excel/PermissionMatrixWriter.js'
import { PermissionMatrixReader } from '../../../src/core/security/excel/PermissionMatrixReader.js'
import type { IValidator, ILogger, ValidationResult } from '../../../src/types/index.js'

/** Validador ligero para el CLI — usa Zod directamente sin i18n. */
const cliValidator: IValidator = {
    validate<T>(data: unknown, schema: unknown): ValidationResult<T> {
        const zSchema = schema as ZodType
        const result = zSchema.safeParse(data)
        if (result.success) return { valid: true, data: result.data as T }
        return {
            valid: false,
            errors: result.error.issues.map((i) => ({
                path: i.path.join('.') || 'root',
                message: i.message,
                code: i.code,
            })),
        }
    },
}

/** Logger ligero para el CLI — delega al console.log con colores. */
const cliLogger: ILogger = {
    info: (msg: string) => console.log(colors.blue(`   ℹ ${msg}`)),
    warn: (msg: string) => console.log(colors.yellow(`   ⚠ ${msg}`)),
    error: (msg: string) => console.log(colors.red(`   ✖ ${msg}`)),
    debug: () => {},
    trace: () => {},
    critical: (msg: string) => console.log(colors.red(`   ✖ ${msg}`)),
    child: () => cliLogger,
} as ILogger

type ManageAction =
    | 'users'
    | 'profiles'
    | 'subsystems'
    | 'menus'
    | 'options'
    | 'assign'
    | 'bos'
    | 'excel'
    | 'status'
    | 'audits'
    | 'exit'

/**
 * Interactive Security Manager — CRUD for all security tables.
 */
export class SecurityManager {
    constructor(private db: Database) {}

    async run(): Promise<void> {
        let running = true

        while (running) {
            const action = (await p.select({
                message: '📋 Security Manager — ¿Qué deseas gestionar?',
                options: [
                    { value: 'users', label: '👤 Users — Crear/listar usuarios' },
                    { value: 'profiles', label: '🏷️  Profiles — Crear/listar perfiles' },
                    { value: 'subsystems', label: '📦 Subsystems — Crear/listar subsistemas' },
                    { value: 'menus', label: '📋 Menus — Crear/listar menús' },
                    { value: 'options', label: '⚙️  Options — Crear/listar opciones' },
                    { value: 'assign', label: '🔗 Assign — Asignar a perfiles' },
                    { value: 'bos', label: '🧩 BOs — Sincronizar objetos de negocio' },
                    { value: 'excel', label: '📊 Excel — Importar/Exportar/Plantilla' },
                    { value: 'status', label: '📈 Status — Resumen del grafo de seguridad' },
                    { value: 'audits', label: '🔍 Audits — Ver auditorías recientes' },
                    { value: 'exit', label: '🚪 Salir' },
                ],
            })) as ManageAction

            if (p.isCancel(action) || action === 'exit') {
                running = false
                break
            }

            switch (action) {
                case 'users':
                    await this.manageUsers()
                    break
                case 'profiles':
                    await this.manageProfiles()
                    break
                case 'subsystems':
                    await this.manageSubsystems()
                    break
                case 'menus':
                    await this.manageMenus()
                    break
                case 'options':
                    await this.manageOptions()
                    break
                case 'assign':
                    await this.manageAssignments()
                    break
                case 'bos':
                    await this.manageBOs()
                    break
                case 'excel':
                    await this.manageExcel()
                    break
                case 'status':
                    await this.showStatus()
                    break
                case 'audits':
                    await this.showAudits()
                    break
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Users
    // ═══════════════════════════════════════════════════════════════════

    private async manageUsers(): Promise<void> {
        const action = await p.select({
            message: '👤 Users',
            options: [
                { value: 'list', label: '📋 Listar usuarios' },
                { value: 'create', label: '➕ Crear usuario' },
                { value: 'back', label: '← Volver' },
            ],
        })

        if (p.isCancel(action) || action === 'back') return

        if (action === 'list') {
            const rows = await this.db.exeRaw(`
                SELECT u.user_id, u.username, p.profile_name,
                       u.user_created_at::date as created
                FROM security.users u
                LEFT JOIN security.profiles p ON u.profile_id = p.profile_id
                ORDER BY u.user_id
            `)
            if (rows.rows.length === 0) {
                console.log(colors.yellow('   No hay usuarios registrados.'))
                return
            }
            console.log(colors.cyan('\n   ID  | Username         | Perfil       | Creado'))
            console.log(colors.gray('   ----+------------------+--------------+-----------'))
            for (const r of rows.rows) {
                console.log(
                    `   ${String(r.user_id).padEnd(4)}| ${String(r.username).padEnd(17)}| ${String(r.profile_name || '—').padEnd(13)}| ${r.created}`
                )
            }
            console.log()
        }

        if (action === 'create') {
            const username = await p.text({ message: 'Nombre de usuario', placeholder: 'vendedor1' })
            if (p.isCancel(username)) return

            const password = await p.password({ message: 'Contraseña' })
            if (p.isCancel(password)) return

            const profiles = await this.db.exeRaw(
                'SELECT profile_id, profile_name FROM security.profiles ORDER BY profile_id'
            )
            if (profiles.rows.length === 0) {
                console.log(colors.yellow('   No hay perfiles. Crea uno primero.'))
                return
            }

            const profileId = await p.select({
                message: 'Perfil',
                options: profiles.rows.map((r: any) => ({
                    value: r.profile_id,
                    label: `${r.profile_name} (id=${r.profile_id})`,
                })),
            })
            if (p.isCancel(profileId)) return

            const passwordHash = await bcrypt.hash(password as string, 10)

            const result = await this.db.exeRaw(
                `INSERT INTO security.users (username, user_password, profile_id, user_email_verified_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (username) DO UPDATE SET user_password = EXCLUDED.user_password, user_email_verified_at = NOW()
                 RETURNING user_id`,
                [username, passwordHash, profileId]
            )
            const userId = result.rows[0]?.user_id

            await this.db.exeRaw(
                `INSERT INTO security.user_profile (user_id, profile_id)
                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [userId, profileId]
            )

            console.log(colors.green(`   ✅ Usuario "${username}" creado (id=${userId})`))
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Profiles
    // ═══════════════════════════════════════════════════════════════════

    private async manageProfiles(): Promise<void> {
        const action = await p.select({
            message: '🏷️  Profiles',
            options: [
                { value: 'list', label: '📋 Listar perfiles' },
                { value: 'create', label: '➕ Crear perfil' },
                { value: 'back', label: '← Volver' },
            ],
        })

        if (p.isCancel(action) || action === 'back') return

        if (action === 'list') {
            const rows = await this.db.exeRaw(`
                SELECT p.profile_id, p.profile_name,
                       (SELECT count(*) FROM security.user_profile up WHERE up.profile_id = p.profile_id) as users,
                       (SELECT count(*) FROM security.profile_method pm WHERE pm.profile_id = p.profile_id) as methods
                FROM security.profiles p ORDER BY p.profile_id
            `)
            console.log(colors.cyan('\n   ID  | Nombre           | Users | Methods'))
            console.log(colors.gray('   ----+------------------+-------+--------'))
            for (const r of rows.rows) {
                console.log(
                    `   ${String(r.profile_id).padEnd(4)}| ${String(r.profile_name).padEnd(17)}| ${String(r.users).padEnd(6)}| ${r.methods}`
                )
            }
            console.log()
        }

        if (action === 'create') {
            const name = await p.text({ message: 'Nombre del perfil', placeholder: 'supervisor' })
            if (p.isCancel(name)) return

            const result = await this.db.exeRaw(
                `INSERT INTO security.profiles (profile_name) VALUES ($1)
                 ON CONFLICT DO NOTHING RETURNING profile_id`,
                [name]
            )
            const id = result.rows[0]?.profile_id
            if (id) {
                console.log(colors.green(`   ✅ Perfil "${name}" creado (id=${id})`))
            } else {
                console.log(colors.yellow(`   ⚠️  Perfil "${name}" ya existe.`))
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Subsystems
    // ═══════════════════════════════════════════════════════════════════

    private async manageSubsystems(): Promise<void> {
        const action = await p.select({
            message: '📦 Subsystems',
            options: [
                { value: 'list', label: '📋 Listar subsistemas' },
                { value: 'create', label: '➕ Crear subsistema' },
                { value: 'link', label: '🔗 Enlazar BOs a subsistema' },
                { value: 'back', label: '← Volver' },
            ],
        })

        if (p.isCancel(action) || action === 'back') return

        if (action === 'list') {
            const rows = await this.db.exeRaw(`
                SELECT s.subsystem_id, s.subsystem_name,
                       (SELECT count(*) FROM security.subsystem_object so WHERE so.subsystem_id = s.subsystem_id) as bos,
                       (SELECT count(*) FROM security.menus m WHERE m.subsystem_id = s.subsystem_id) as menus
                FROM security.subsystems s ORDER BY s.subsystem_id
            `)
            if (rows.rows.length === 0) {
                console.log(colors.yellow('   No hay subsistemas registrados.'))
                return
            }
            console.log(colors.cyan('\n   ID  | Nombre           | BOs  | Menús'))
            console.log(colors.gray('   ----+------------------+------+------'))
            for (const r of rows.rows) {
                console.log(
                    `   ${String(r.subsystem_id).padEnd(4)}| ${String(r.subsystem_name).padEnd(17)}| ${String(r.bos).padEnd(5)}| ${r.menus}`
                )
            }
            console.log()
        }

        if (action === 'create') {
            const name = await p.text({ message: 'Nombre del subsistema', placeholder: 'Ventas' })
            if (p.isCancel(name)) return

            const result = await this.db.exeRaw(
                `INSERT INTO security.subsystems (subsystem_name) VALUES ($1)
                 ON CONFLICT (subsystem_name) DO NOTHING RETURNING subsystem_id`,
                [name]
            )
            const id = result.rows[0]?.subsystem_id
            if (id) {
                console.log(colors.green(`   ✅ Subsistema "${name}" creado (id=${id})`))
            } else {
                console.log(colors.yellow(`   ⚠️  Subsistema "${name}" ya existe.`))
            }
        }

        if (action === 'link') {
            const subsystems = await this.db.exeRaw(
                'SELECT subsystem_id, subsystem_name FROM security.subsystems ORDER BY subsystem_id'
            )
            if (subsystems.rows.length === 0) {
                console.log(colors.yellow('   No hay subsistemas. Crea uno primero.'))
                return
            }

            const subsystemId = await p.select({
                message: 'Selecciona subsistema',
                options: subsystems.rows.map((r: any) => ({
                    value: r.subsystem_id,
                    label: `${r.subsystem_name} (id=${r.subsystem_id})`,
                })),
            })
            if (p.isCancel(subsystemId)) return

            const objects = await this.db.exeRaw(
                `SELECT o.object_id, o.object_name
                 FROM security.objects o
                 WHERE o.object_id NOT IN (
                     SELECT so.object_id FROM security.subsystem_object so
                     WHERE so.subsystem_id = $1
                 )
                 ORDER BY o.object_name`,
                [subsystemId]
            )
            if (objects.rows.length === 0) {
                console.log(colors.yellow('   Todos los BOs ya están enlazados a este subsistema.'))
                return
            }

            const selected = await p.multiselect({
                message: 'Selecciona BOs para enlazar',
                options: objects.rows.map((r: any) => ({
                    value: r.object_id,
                    label: r.object_name,
                })),
            })
            if (p.isCancel(selected)) return

            let linked = 0
            for (const objectId of selected as number[]) {
                await this.db.exeRaw(
                    `INSERT INTO security.subsystem_object (subsystem_id, object_id)
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [subsystemId, objectId]
                )
                linked++
            }
            console.log(colors.green(`   ✅ ${linked} BOs enlazados al subsistema.`))
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Menus
    // ═══════════════════════════════════════════════════════════════════

    private async manageMenus(): Promise<void> {
        const action = await p.select({
            message: '📋 Menus',
            options: [
                { value: 'list', label: '📋 Listar menús' },
                { value: 'create', label: '➕ Crear menú' },
                { value: 'back', label: '← Volver' },
            ],
        })

        if (p.isCancel(action) || action === 'back') return

        if (action === 'list') {
            const rows = await this.db.exeRaw(`
                SELECT m.menu_id, m.menu_name, s.subsystem_name,
                       (SELECT count(*) FROM security.menu_option mo WHERE mo.menu_id = m.menu_id) as options
                FROM security.menus m
                LEFT JOIN security.subsystems s ON m.subsystem_id = s.subsystem_id
                ORDER BY m.menu_id
            `)
            if (rows.rows.length === 0) {
                console.log(colors.yellow('   No hay menús registrados.'))
                return
            }
            console.log(colors.cyan('\n   ID  | Menú             | Subsistema       | Opciones'))
            console.log(colors.gray('   ----+------------------+------------------+---------'))
            for (const r of rows.rows) {
                console.log(
                    `   ${String(r.menu_id).padEnd(4)}| ${String(r.menu_name).padEnd(17)}| ${String(r.subsystem_name || '—').padEnd(17)}| ${r.options}`
                )
            }
            console.log()
        }

        if (action === 'create') {
            const subsystems = await this.db.exeRaw(
                'SELECT subsystem_id, subsystem_name FROM security.subsystems ORDER BY subsystem_id'
            )

            let subsystemId: number | null = null
            if (subsystems.rows.length > 0) {
                const sub = await p.select({
                    message: 'Subsistema (padre)',
                    options: [
                        { value: 0, label: '— Sin subsistema —' },
                        ...subsystems.rows.map((r: any) => ({
                            value: r.subsystem_id,
                            label: r.subsystem_name,
                        })),
                    ],
                })
                if (p.isCancel(sub)) return
                subsystemId = sub === 0 ? null : (sub as number)
            }

            const name = await p.text({ message: 'Nombre del menú', placeholder: 'Panel Principal' })
            if (p.isCancel(name)) return

            const result = await this.db.exeRaw(
                `INSERT INTO security.menus (menu_name, subsystem_id) VALUES ($1, $2) RETURNING menu_id`,
                [name, subsystemId]
            )
            console.log(colors.green(`   ✅ Menú "${name}" creado (id=${result.rows[0]?.menu_id})`))
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Options
    // ═══════════════════════════════════════════════════════════════════

    private async manageOptions(): Promise<void> {
        const action = await p.select({
            message: '⚙️  Options',
            options: [
                { value: 'list', label: '📋 Listar opciones' },
                { value: 'create', label: '➕ Crear opción' },
                { value: 'link', label: '🔗 Enlazar opciones a menú' },
                { value: 'back', label: '← Volver' },
            ],
        })

        if (p.isCancel(action) || action === 'back') return

        if (action === 'list') {
            const rows = await this.db.exeRaw(`
                SELECT o.option_id, o.option_name, m.method_name,
                       obj.object_name
                FROM security.options o
                LEFT JOIN security.methods m ON o.method_id = m.method_id
                LEFT JOIN security.object_method om ON m.method_id = om.method_id
                LEFT JOIN security.objects obj ON om.object_id = obj.object_id
                ORDER BY o.option_id
            `)
            if (rows.rows.length === 0) {
                console.log(colors.yellow('   No hay opciones registradas.'))
                return
            }
            console.log(colors.cyan('\n   ID  | Opción           | Método (BO)'))
            console.log(colors.gray('   ----+------------------+---------------------------'))
            for (const r of rows.rows) {
                const method = r.object_name ? `${r.object_name}.${r.method_name}` : r.method_name || '—'
                console.log(`   ${String(r.option_id).padEnd(4)}| ${String(r.option_name).padEnd(17)}| ${method}`)
            }
            console.log()
        }

        if (action === 'create') {
            const name = await p.text({ message: 'Nombre de la opción', placeholder: 'Ver Dashboard' })
            if (p.isCancel(name)) return

            const methods = await this.db.exeRaw(`
                SELECT m.method_id, m.method_name, obj.object_name
                FROM security.methods m
                LEFT JOIN security.object_method om ON m.method_id = om.method_id
                LEFT JOIN security.objects obj ON om.object_id = obj.object_id
                ORDER BY obj.object_name, m.method_name
            `)

            let methodId: number | null = null
            if (methods.rows.length > 0) {
                const mid = await p.select({
                    message: 'Enlazar a método (opcional)',
                    options: [
                        { value: 0, label: '— Sin método —' },
                        ...methods.rows.map((r: any) => ({
                            value: r.method_id,
                            label: r.object_name
                                ? `${r.object_name}.${r.method_name}`
                                : r.method_name,
                        })),
                    ],
                })
                if (p.isCancel(mid)) return
                methodId = mid === 0 ? null : (mid as number)
            }

            const result = await this.db.exeRaw(
                `INSERT INTO security.options (option_name, method_id) VALUES ($1, $2) RETURNING option_id`,
                [name, methodId]
            )
            console.log(colors.green(`   ✅ Opción "${name}" creada (id=${result.rows[0]?.option_id})`))
        }

        if (action === 'link') {
            const menus = await this.db.exeRaw(
                'SELECT menu_id, menu_name FROM security.menus ORDER BY menu_id'
            )
            if (menus.rows.length === 0) {
                console.log(colors.yellow('   No hay menús. Crea uno primero.'))
                return
            }

            const menuId = await p.select({
                message: 'Selecciona menú',
                options: menus.rows.map((r: any) => ({
                    value: r.menu_id,
                    label: `${r.menu_name} (id=${r.menu_id})`,
                })),
            })
            if (p.isCancel(menuId)) return

            const options = await this.db.exeRaw(
                `SELECT o.option_id, o.option_name
                 FROM security.options o
                 WHERE o.option_id NOT IN (
                     SELECT mo.option_id FROM security.menu_option mo WHERE mo.menu_id = $1
                 )
                 ORDER BY o.option_name`,
                [menuId]
            )
            if (options.rows.length === 0) {
                console.log(colors.yellow('   Todas las opciones ya están en este menú.'))
                return
            }

            const selected = await p.multiselect({
                message: 'Selecciona opciones para agregar al menú',
                options: options.rows.map((r: any) => ({
                    value: r.option_id,
                    label: r.option_name,
                })),
            })
            if (p.isCancel(selected)) return

            let linked = 0
            for (const optionId of selected as number[]) {
                await this.db.exeRaw(
                    `INSERT INTO security.menu_option (menu_id, option_id)
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [menuId, optionId]
                )
                linked++
            }
            console.log(colors.green(`   ✅ ${linked} opciones agregadas al menú.`))
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Assignments (Profile → Subsystem/Menu/Option)
    // ═══════════════════════════════════════════════════════════════════

    private async manageAssignments(): Promise<void> {
        const profiles = await this.db.exeRaw(
            'SELECT profile_id, profile_name FROM security.profiles ORDER BY profile_id'
        )
        if (profiles.rows.length === 0) {
            console.log(colors.yellow('   No hay perfiles. Crea uno primero.'))
            return
        }

        const profileId = await p.select({
            message: '🔗 Asignar a perfil:',
            options: profiles.rows.map((r: any) => ({
                value: r.profile_id,
                label: `${r.profile_name} (id=${r.profile_id})`,
            })),
        })
        if (p.isCancel(profileId)) return

        const entity = await p.select({
            message: '¿Qué asignar?',
            options: [
                { value: 'subsystems', label: '📦 Subsistemas' },
                { value: 'menus', label: '📋 Menús' },
                { value: 'options', label: '⚙️  Opciones' },
                { value: 'back', label: '← Volver' },
            ],
        })
        if (p.isCancel(entity) || entity === 'back') return

        if (entity === 'subsystems') {
            const items = await this.db.exeRaw(
                `SELECT s.subsystem_id, s.subsystem_name FROM security.subsystems s
                 WHERE s.subsystem_id NOT IN (
                     SELECT ps.subsystem_id FROM security.profile_subsystem ps WHERE ps.profile_id = $1
                 ) ORDER BY s.subsystem_name`,
                [profileId]
            )
            if (items.rows.length === 0) {
                console.log(colors.yellow('   Todos los subsistemas ya están asignados.'))
                return
            }
            const selected = await p.multiselect({
                message: 'Selecciona subsistemas',
                options: items.rows.map((r: any) => ({
                    value: r.subsystem_id,
                    label: r.subsystem_name,
                })),
            })
            if (p.isCancel(selected)) return

            for (const id of selected as number[]) {
                await this.db.exeRaw(
                    `INSERT INTO security.profile_subsystem (profile_id, subsystem_id)
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [profileId, id]
                )
            }
            console.log(colors.green(`   ✅ ${(selected as number[]).length} subsistemas asignados.`))
        }

        if (entity === 'menus') {
            const items = await this.db.exeRaw(
                `SELECT m.menu_id, m.menu_name FROM security.menus m
                 WHERE m.menu_id NOT IN (
                     SELECT pm.menu_id FROM security.profile_menu pm WHERE pm.profile_id = $1
                 ) ORDER BY m.menu_name`,
                [profileId]
            )
            if (items.rows.length === 0) {
                console.log(colors.yellow('   Todos los menús ya están asignados.'))
                return
            }
            const selected = await p.multiselect({
                message: 'Selecciona menús',
                options: items.rows.map((r: any) => ({
                    value: r.menu_id,
                    label: r.menu_name,
                })),
            })
            if (p.isCancel(selected)) return

            for (const id of selected as number[]) {
                await this.db.exeRaw(
                    `INSERT INTO security.profile_menu (profile_id, menu_id)
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [profileId, id]
                )
            }
            console.log(colors.green(`   ✅ ${(selected as number[]).length} menús asignados.`))
        }

        if (entity === 'options') {
            const items = await this.db.exeRaw(
                `SELECT o.option_id, o.option_name FROM security.options o
                 WHERE o.option_id NOT IN (
                     SELECT po.option_id FROM security.profile_option po WHERE po.profile_id = $1
                 ) ORDER BY o.option_name`,
                [profileId]
            )
            if (items.rows.length === 0) {
                console.log(colors.yellow('   Todas las opciones ya están asignadas.'))
                return
            }
            const selected = await p.multiselect({
                message: 'Selecciona opciones',
                options: items.rows.map((r: any) => ({
                    value: r.option_id,
                    label: r.option_name,
                })),
            })
            if (p.isCancel(selected)) return

            for (const id of selected as number[]) {
                await this.db.exeRaw(
                    `INSERT INTO security.profile_option (profile_id, option_id)
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [profileId, id]
                )
            }
            console.log(colors.green(`   ✅ ${(selected as number[]).length} opciones asignadas.`))
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Status
    // ═══════════════════════════════════════════════════════════════════

    private async showStatus(): Promise<void> {
        const counts = await this.db.exeRaw(`
            SELECT
                (SELECT count(*) FROM security.users) as users,
                (SELECT count(*) FROM security.profiles) as profiles,
                (SELECT count(*) FROM security.subsystems) as subsystems,
                (SELECT count(*) FROM security.menus) as menus,
                (SELECT count(*) FROM security.options) as options,
                (SELECT count(*) FROM security.objects) as objects,
                (SELECT count(*) FROM security.methods) as methods,
                (SELECT count(*) FROM security.transactions) as transactions,
                (SELECT count(*) FROM security.profile_method) as profile_methods,
                (SELECT count(*) FROM security.profile_subsystem) as profile_subsystems,
                (SELECT count(*) FROM security.profile_menu) as profile_menus,
                (SELECT count(*) FROM security.profile_option) as profile_options,
                (SELECT count(*) FROM security.subsystem_object) as subsystem_objects,
                (SELECT count(*) FROM security.menu_option) as menu_options,
                (SELECT count(*) FROM security.audit_logs) as audit_logs
        `)

        const c = counts.rows[0]

        console.log(colors.cyan('\n   📊 Security Graph Status'))
        console.log(colors.gray('   ══════════════════════════════════════'))
        console.log(`   👤 Users:              ${colors.white(c.users)}`)
        console.log(`   🏷️  Profiles:           ${colors.white(c.profiles)}`)
        console.log(`   📦 Subsystems:         ${colors.white(c.subsystems)}`)
        console.log(`   📋 Menus:              ${colors.white(c.menus)}`)
        console.log(`   ⚙️  Options:            ${colors.white(c.options)}`)
        console.log(`   🧩 Objects (BOs):      ${colors.white(c.objects)}`)
        console.log(`   🔧 Methods:            ${colors.white(c.methods)}`)
        console.log(`   🔄 Transactions:       ${colors.white(c.transactions)}`)
        console.log(colors.gray('   ── Relations ──────────────────────'))
        console.log(`   🔗 Profile → Methods:     ${colors.white(c.profile_methods)}`)
        console.log(`   🔗 Profile → Subsystems:  ${colors.white(c.profile_subsystems)}`)
        console.log(`   🔗 Profile → Menus:       ${colors.white(c.profile_menus)}`)
        console.log(`   🔗 Profile → Options:     ${colors.white(c.profile_options)}`)
        console.log(`   🔗 Subsystem → Objects:   ${colors.white(c.subsystem_objects)}`)
        console.log(`   🔗 Menu → Options:        ${colors.white(c.menu_options)}`)
        console.log(colors.gray('   ── Audit ──────────────────────────'))
        console.log(`   📝 Audit Logs:         ${colors.white(c.audit_logs)}`)
        console.log()
    }

    // ═══════════════════════════════════════════════════════════════════
    // Audits
    // ═══════════════════════════════════════════════════════════════════

    private async showAudits(): Promise<void> {
        const limit = await p.text({
            message: 'Cantidad de registros a mostrar',
            placeholder: '20',
            defaultValue: '20',
        })
        if (p.isCancel(limit)) return

        const rows = await this.db.exeRaw(
            `SELECT a.id, a.request_id, a.user_id, u.username,
                    a.action, a.object_name, a.method_name, a.tx,
                    a.created_at, a.details
             FROM security.audit_logs a
             LEFT JOIN security.users u ON a.user_id = u.user_id
             ORDER BY a.created_at DESC
             LIMIT $1`,
            [parseInt(limit as string, 10) || 20]
        )

        if (rows.rows.length === 0) {
            console.log(colors.yellow('   No hay audit logs registrados.'))
            return
        }

        console.log(colors.cyan(`\n   🔍 Últimos ${rows.rows.length} audit logs\n`))

        for (const r of rows.rows) {
            const time = new Date(r.created_at).toLocaleString()
            const user = r.username || `uid:${r.user_id || '?'}`
            const action = r.action || '?'
            const target = r.object_name && r.method_name
                ? `${r.object_name}.${r.method_name}`
                : r.object_name || '—'

            console.log(
                colors.gray(`   ${time}`) +
                ` | ` +
                colors.white(user.padEnd(12)) +
                ` | ` +
                colors.cyan(action.padEnd(8)) +
                ` | ` +
                colors.yellow(target.padEnd(25)) +
                (r.tx ? colors.gray(` tx:${r.tx}`) : '')
            )

            if (r.details && Object.keys(r.details).length > 0) {
                const detail = JSON.stringify(r.details)
                if (detail.length > 80) {
                    console.log(colors.gray(`     └─ ${detail.substring(0, 80)}...`))
                } else {
                    console.log(colors.gray(`     └─ ${detail}`))
                }
            }
        }
        console.log()
    }

    // ═══════════════════════════════════════════════════════════════════
    // Excel Import/Export
    // ═══════════════════════════════════════════════════════════════════

    private async manageExcel(): Promise<void> {
        const action = await p.select({
            message: '📊 Excel — Matriz de Permisos',
            options: [
                { value: 'template', label: '📝 Generar plantilla vacía' },
                { value: 'export', label: '📤 Exportar datos actuales' },
                { value: 'import', label: '📥 Importar desde archivo' },
                { value: 'back', label: '← Volver' },
            ],
        })

        if (p.isCancel(action) || action === 'back') return

        if (action === 'template') {
            const writer = new PermissionMatrixWriter(this.db)
            const buffer = await writer.generateTemplate()
            const filename = `security_template_${Date.now()}.xlsx`
            writeFileSync(filename, buffer)
            console.log(colors.green(`   ✅ Plantilla generada: ${filename}`))
        }

        if (action === 'export') {
            const writer = new PermissionMatrixWriter(this.db)
            const buffer = await writer.exportData()
            const filename = `security_export_${Date.now()}.xlsx`
            writeFileSync(filename, buffer)
            console.log(colors.green(`   ✅ Exportación generada: ${filename}`))
        }

        if (action === 'import') {
            const filepath = await p.text({
                message: 'Ruta del archivo Excel (.xlsx)',
                placeholder: './security_template_123456.xlsx',
            })
            if (p.isCancel(filepath)) return

            try {
                const buffer = readFileSync(filepath as string)
                const reader = new PermissionMatrixReader(this.db, cliValidator, cliLogger)
                const result = await reader.import(buffer)

                console.log(colors.cyan('\n   📊 Resultado de importación:'))
                for (const s of result.summary) {
                    console.log(
                        `   ${s.sheet.padEnd(15)} | procesadas: ${String(s.processed).padEnd(4)} | insertadas: ${String(s.inserted).padEnd(4)} | omitidas: ${s.skipped}`
                    )
                }

                if (result.errors.length > 0) {
                    console.log(colors.red(`\n   ❌ ${result.errors.length} errores:`));
                    for (const e of result.errors.slice(0, 20)) {
                        console.log(colors.red(`   [${e.sheet}] Fila ${e.row}, ${e.column}: ${e.message}`))
                    }
                    if (result.errors.length > 20) {
                        console.log(colors.gray(`   ... y ${result.errors.length - 20} errores más`))
                    }
                } else {
                    console.log(colors.green('\n   ✅ Importación completada sin errores.'))
                }
                console.log()

                // Post-import: comparar métodos DB vs código
                if (result.success) {
                    await this.showBOSyncWarning()
                }
            } catch (err) {
                console.log(colors.red(`   ❌ Error leyendo archivo: ${err instanceof Error ? err.message : err}`))
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // BOs — Sincronización de objetos de negocio
    // ═════════════════════════════════════════════════════════════════

    private async manageBOs(): Promise<void> {
        console.log(colors.cyan('\n   🧩 Sincronización de Business Objects\n'))

        // 1. Discover BOs del código
        const boRoot = path.resolve(process.cwd(), 'BO')
        const codeBOs = await this.discoverBOsFromCode(boRoot)

        // 2. Leer BOs de la DB
        const dbMethods = await this.getDBMethods()

        // 3. Construir sets para comparación
        const codeMethodSet = new Set<string>()
        for (const bo of codeBOs) {
            for (const method of bo.methods) {
                codeMethodSet.add(`${bo.objectName}.${method}`)
            }
        }

        const dbMethodSet = new Set<string>()
        for (const m of dbMethods) {
            dbMethodSet.add(`${m.objectName}.${m.methodName}`)
        }

        // 4. Clasificar
        const onlyInCode = [...codeMethodSet].filter((m) => !dbMethodSet.has(m)).sort()
        const onlyInDB = [...dbMethodSet].filter((m) => !codeMethodSet.has(m)).sort()
        const inBoth = [...codeMethodSet].filter((m) => dbMethodSet.has(m)).sort()

        // 5. Tabla: En código
        console.log(colors.blue('   💻 En código (BO/)').bold)
        if (codeBOs.length === 0) {
            console.log(colors.yellow('   No se encontraron BOs en BO/'))
        } else {
            const tableCode = new Table({
                head: [colors.gray('Objeto'), colors.gray('Métodos'), colors.gray('Detalle')],
                style: { border: ['gray'] }
            })
            for (const bo of codeBOs) {
                const detail = bo.methods.slice(0, 3).join(', ') + (bo.methods.length > 3 ? '...' : '')
                tableCode.push([bo.objectName, bo.methods.length, detail])
            }
            console.log(tableCode.toString().replace(/^/gm, '   '))
        }

        // 6. Tabla: En base de datos
        console.log(colors.blue('\n   🗄️  En base de datos').bold)
        if (dbMethods.length === 0) {
            console.log(colors.yellow('   No hay métodos registrados en DB'))
        } else {
            const dbBOs = new Map<string, string[]>()
            for (const m of dbMethods) {
                if (!dbBOs.has(m.objectName)) dbBOs.set(m.objectName, [])
                dbBOs.get(m.objectName)!.push(m.methodName)
            }

            const tableDB = new Table({
                head: [colors.gray('Objeto'), colors.gray('Métodos'), colors.gray('Detalle')],
                style: { border: ['gray'] }
            })
            for (const [objName, methods] of dbBOs) {
                const detail = methods.slice(0, 3).join(', ') + (methods.length > 3 ? '...' : '')
                tableDB.push([objName, methods.length, detail])
            }
            console.log(tableDB.toString().replace(/^/gm, '   '))
        }

        // 7. Resumen comparativo
        console.log(colors.cyan('\n   📊 Resumen:').bold)
        console.log(colors.green(`   ✔ Sincronizados: ${inBoth.length} métodos`))

        if (onlyInCode.length > 0) {
            console.log(colors.yellow(`   ⚠ Solo en código (falta registrar): ${onlyInCode.length}`))
            for (const m of onlyInCode) {
                console.log(colors.yellow(`     • ${m}`))
            }
        }

        if (onlyInDB.length > 0) {
            console.log(colors.yellow(`   ⚠ Solo en DB (sin código aún): ${onlyInDB.length}`))
            for (const m of onlyInDB) {
                console.log(colors.yellow(`     • ${m}`))
            }
        }

        if (onlyInCode.length === 0 && onlyInDB.length === 0) {
            console.log(colors.green('   ✔ Código y DB están completamente sincronizados'))
            return
        }

        // 8. Auto-registrar los que faltan en DB
        if (onlyInCode.length > 0) {
            console.log(colors.cyan(`\n   Registrando ${onlyInCode.length} métodos faltantes en DB...`))

            // Obtener próximo tx
            const txRes = await this.db.exeRaw(
                'SELECT COALESCE(MAX(transaction_number::integer), 0) + 1 AS next_tx FROM security.transactions'
            )
            let nextTx = Number(txRes.rows[0]?.next_tx) || 1

            for (const fullMethod of onlyInCode) {
                const [objectName, methodName] = fullMethod.split('.')

                // Upsert object
                let objectId: number
                const existObj = await this.db.exeRaw('SELECT object_id FROM security.objects WHERE object_name = $1', [objectName])
                if (existObj.rows[0]?.object_id) {
                    objectId = existObj.rows[0].object_id
                } else {
                    const newObj = await this.db.exeRaw('INSERT INTO security.objects (object_name) VALUES ($1) RETURNING object_id', [objectName])
                    objectId = newObj.rows[0].object_id
                }

                // Upsert method
                let methodId: number
                const existMet = await this.db.exeRaw('SELECT method_id FROM security.methods WHERE method_name = $1', [methodName])
                if (existMet.rows[0]?.method_id) {
                    methodId = existMet.rows[0].method_id
                } else {
                    const newMet = await this.db.exeRaw('INSERT INTO security.methods (method_name) VALUES ($1) RETURNING method_id', [methodName])
                    methodId = newMet.rows[0].method_id
                }

                // Link object_method
                const existLink = await this.db.exeRaw(
                    'SELECT 1 FROM security.object_method WHERE object_id = $1 AND method_id = $2', [objectId, methodId]
                )
                if ((existLink.rowCount ?? 0) === 0) {
                    await this.db.exeRaw('INSERT INTO security.object_method (object_id, method_id) VALUES ($1, $2)', [objectId, methodId])
                }

                // Transaction
                const existTx = await this.db.exeRaw(
                    'SELECT 1 FROM security.transactions WHERE method_id = $1 AND object_id = $2', [methodId, objectId]
                )
                if ((existTx.rowCount ?? 0) === 0) {
                    await this.db.exeRaw(
                        'INSERT INTO security.transactions (transaction_number, method_id, object_id) VALUES ($1, $2, $3)',
                        [String(nextTx), methodId, objectId]
                    )
                    nextTx++
                }

                // Grant to profile 1 (admin)
                const existPerm = await this.db.exeRaw(
                    'SELECT 1 FROM security.profile_method WHERE profile_id = 1 AND method_id = $1', [methodId]
                )
                if ((existPerm.rowCount ?? 0) === 0) {
                    await this.db.exeRaw('INSERT INTO security.profile_method (profile_id, method_id) VALUES (1, $1)', [methodId])
                }

                console.log(colors.green(`   ✔ ${fullMethod}`))
            }

            console.log(colors.green(`\n   ✔ ${onlyInCode.length} métodos registrados exitosamente`))
        }

        // 9. Preguntar prune si hay huérfanos
        if (onlyInDB.length > 0) {
            console.log(colors.yellow(`\n   ⚠ Hay ${onlyInDB.length} métodos en DB que no existen en código:`))
            for (const m of onlyInDB) {
                console.log(colors.yellow(`     • ${m}`))
            }

            const shouldPrune = await p.confirm({
                message: `¿Deseas eliminar los ${onlyInDB.length} métodos huérfanos de la DB?`,
                initialValue: false,
            })

            if (p.isCancel(shouldPrune) || !shouldPrune) {
                console.log(colors.gray('   Prune cancelado. Los métodos huérfanos permanecen en DB.'))
            } else {
                for (const fullMethod of onlyInDB) {
                    const [objectName, methodName] = fullMethod.split('.')
                    const metRes = await this.db.exeRaw(
                        `SELECT m.method_id FROM security.methods m
                         INNER JOIN security.object_method om ON m.method_id = om.method_id
                         INNER JOIN security.objects o ON om.object_id = o.object_id
                         WHERE o.object_name = $1 AND m.method_name = $2`,
                        [objectName, methodName]
                    )
                    if (metRes.rows[0]?.method_id) {
                        const mId = metRes.rows[0].method_id
                        await this.db.exeRaw('DELETE FROM security.profile_method WHERE method_id = $1', [mId])
                        await this.db.exeRaw('DELETE FROM security.object_method WHERE method_id = $1', [mId])
                        await this.db.exeRaw('DELETE FROM security.transactions WHERE method_id = $1', [mId])
                        await this.db.exeRaw('DELETE FROM security.methods WHERE method_id = $1', [mId])
                        console.log(colors.red(`   🗑️  ${fullMethod} eliminado`))
                    }
                }
                console.log(colors.green(`\n   ✔ ${onlyInDB.length} métodos huérfanos eliminados`))
            }
        }

        console.log()
    }

    /** Post-import: muestra warning si hay métodos en DB sin código. */
    private async showBOSyncWarning(): Promise<void> {
        const boRoot = path.resolve(process.cwd(), 'BO')
        const codeBOs = await this.discoverBOsFromCode(boRoot)
        const dbMethods = await this.getDBMethods()

        const codeMethodSet = new Set<string>()
        for (const bo of codeBOs) {
            for (const method of bo.methods) {
                codeMethodSet.add(`${bo.objectName}.${method}`)
            }
        }

        const onlyInDB = dbMethods.filter((m) => !codeMethodSet.has(`${m.objectName}.${m.methodName}`))

        if (onlyInDB.length > 0) {
            console.log(colors.yellow(`\n   ⚠ ${onlyInDB.length} métodos registrados en DB aún no tienen código en BO/`))
            console.log(colors.gray('   (Se desarrollarán más adelante)'))
            for (const m of onlyInDB.slice(0, 10)) {
                console.log(colors.yellow(`     • ${m.objectName}.${m.methodName}`))
            }
            if (onlyInDB.length > 10) {
                console.log(colors.gray(`     ... y ${onlyInDB.length - 10} más`))
            }
        }
    }

    /** Descubre BOs del directorio de código. */
    private async discoverBOsFromCode(boRoot: string): Promise<{ objectName: string; methods: string[] }[]> {
        const bos: { objectName: string; methods: string[] }[] = []

        try {
            const entries = await fs.readdir(boRoot, { withFileTypes: true })

            for (const entry of entries) {
                if (!entry.isDirectory()) continue

                const objectName = entry.name
                const boFilePath = path.join(boRoot, objectName, `${objectName}BO.ts`)

                try {
                    await fs.access(boFilePath)
                    const content = await fs.readFile(boFilePath, 'utf-8')
                    const methods = this.parseAsyncMethods(content)

                    if (methods.length > 0) {
                        bos.push({ objectName, methods })
                    }
                } catch {
                    // BO file doesn't exist, skip
                }
            }
        } catch {
            // BO directory doesn't exist
        }

        return bos
    }

    /** Extrae nombres de métodos async de un archivo BO.ts. */
    private parseAsyncMethods(content: string): string[] {
        const methods: string[] = []
        const regex = /\basync\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(content)) !== null) {
            const name = match[1]
            if (name && name !== 'constructor' && !name.startsWith('_')) {
                methods.push(name)
            }
        }

        return [...new Set(methods)]
    }

    /** Obtiene todos los métodos registrados en la DB. */
    private async getDBMethods(): Promise<{ methodId: number; objectName: string; methodName: string }[]> {
        const result = await this.db.exeRaw(`
            SELECT m.method_id, o.object_name, m.method_name
            FROM security.methods m
            JOIN security.object_method om ON om.method_id = m.method_id
            JOIN security.objects o ON o.object_id = om.object_id
            ORDER BY o.object_name, m.method_name
        `)

        return result.rows.map((row: any) => ({
            methodId: row.method_id,
            objectName: row.object_name,
            methodName: row.method_name,
        }))
    }
}
