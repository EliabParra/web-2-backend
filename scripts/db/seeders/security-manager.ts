import { Database } from '../core/db.js'
import * as p from '@clack/prompts'
import bcrypt from 'bcrypt'
import colors from 'colors'

type ManageAction =
    | 'users'
    | 'profiles'
    | 'subsystems'
    | 'menus'
    | 'options'
    | 'assign'
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
                    { value: 'status', label: '📊 Status — Resumen del grafo de seguridad' },
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
                       u.created_at::date as created
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
                `INSERT INTO security.users (username, user_password, profile_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (username) DO UPDATE SET user_password = EXCLUDED.user_password
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
}
