import {
    IDatabase,
    ILogger,
    IContainer,
    IMenuProvider,
    SecuritySubsystem,
    SecurityMenu,
    SecurityOption,
    MenuStructure,
    DBSubsystem,
    DBMenu,
    DBOption,
    DBMenuOption,
    DBProfileAssignment,
} from '@toproc/types'
import { SecurityQueries } from '@toproc/security'

/**
 * MenuProvider — Proveedor de estructura de menús y gestión de asignaciones.
 *
 * Responsabilidades:
 * 1. Carga y cachea la estructura de seguridad (Subsistemas, Menús, Opciones).
 * 2. Gestiona asignaciones de perfil (visibilidad).
 * 3. Construye la estructura de menús filtrada para un perfil.
 * 4. CRUD con Dual Write (DB + memoria).
 */
export class MenuProvider implements IMenuProvider {
    private db: IDatabase
    private log: ILogger
    // Structural Maps
    private subsystems = new Map<number, SecuritySubsystem>()
    private menus = new Map<number, SecurityMenu>()
    private options = new Map<number, SecurityOption>()

    // Relational Map (Menu -> Options)
    // We map MenuID -> Set<OptionID>
    private menuOptions = new Map<number, Set<number>>()

    // Assignment Maps (Profile -> Set of IDs)
    private profileSubsystems = new Map<number, Set<number>>()
    private profileMenus = new Map<number, Set<number>>()
    private profileOptions = new Map<number, Set<number>>()

    constructor(container: IContainer) {
        this.db = container.resolve<IDatabase>('db')
        this.log = container.resolve<ILogger>('log').child({ category: 'MenuProvider' })
    }

    private toPositiveInt(value: unknown): number | null {
        const parsed = Number(value)
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null
    }

    /**
     * Loads the entire security structure and assignments into memory.
     * Should be called on system startup.
     */
    async load(): Promise<void> {
        this.log.info('MenuProvider: Loading security structure...')
        try {
            await Promise.all([this.loadStructure(), this.loadAssignments()])
            this.log.info(
                `MenuProvider: Loaded ` +
                    `Subsystems: ${this.subsystems.size}, ` +
                    `Menus: ${this.menus.size}, ` +
                    `Options: ${this.options.size}, ` +
                    `Relations: ${this.menuOptions.size}`
            )
        } catch (err) {
            this.log.error(`MenuProvider: Error loading structure: ${err}`)
            throw err
        }
    }

    private async loadStructure() {
        // Subsystems
        const subRes = await this.db.query<DBSubsystem>(SecurityQueries.SELECT_SUBSYSTEMS)
        this.subsystems.clear()
        // TODO(REVERT_NAMING): Revert subsystem_na to subsystem_name
        subRes.rows.forEach((r) => {
            const subsystemId = this.toPositiveInt(r.subsystem_id)
            if (!subsystemId) return

            this.subsystems.set(subsystemId, {
                subsystem_id: subsystemId,
                subsystem_na: r.subsystem_na,
                menus: [],
            })
        })

        // Menus
        const menuRes = await this.db.query<DBMenu>(SecurityQueries.SELECT_MENUS)
        this.menus.clear()
        // TODO(REVERT_NAMING): Revert menu_na to menu_name
        menuRes.rows.forEach((r) => {
            const menuId = this.toPositiveInt(r.menu_id)
            const subsystemId = this.toPositiveInt(r.subsystem_id)
            if (!menuId || !subsystemId) return

            this.menus.set(menuId, {
                menu_id: menuId,
                menu_na: r.menu_na,
                subsystem_id: subsystemId,
                options: [],
            })
        })

        // Options
        const optRes = await this.db.query<DBOption>(SecurityQueries.SELECT_OPTIONS)
        this.options.clear()
        // TODO(REVERT_NAMING): Revert option_na to option_name
        optRes.rows.forEach((r) => {
            const optionId = this.toPositiveInt(r.option_id)
            const methodId = this.toPositiveInt(r.method_id)
            if (!optionId) return

            this.options.set(optionId, {
                option_id: optionId,
                option_na: r.option_na,
                method_id: methodId ?? undefined,
            })
        })

        // Menu-Option Relations
        const moRes = await this.db.query<DBMenuOption>(SecurityQueries.SELECT_MENU_OPTIONS)
        this.menuOptions.clear()
        moRes.rows.forEach((r) => {
            const menuId = this.toPositiveInt(r.menu_id)
            const optionId = this.toPositiveInt(r.option_id)
            if (!menuId || !optionId) return

            if (!this.menuOptions.has(menuId)) this.menuOptions.set(menuId, new Set())
            this.menuOptions.get(menuId)?.add(optionId)
        })
    }

    private async loadAssignments() {
        // Profile -> Subsystems
        const psRes = await this.db.query<DBProfileAssignment>(
            SecurityQueries.SELECT_PROFILE_SUBSYSTEMS
        )
        this.profileSubsystems.clear()
        psRes.rows.forEach((r) => {
            const profileId = this.toPositiveInt(r.profile_id)
            const subsystemId = this.toPositiveInt(r.subsystem_id)
            if (!profileId || !subsystemId) return

            if (!this.profileSubsystems.has(profileId)) {
                this.profileSubsystems.set(profileId, new Set())
            }
            this.profileSubsystems.get(profileId)?.add(subsystemId)
        })

        // Profile -> Menus
        const pmRes = await this.db.query<DBProfileAssignment>(SecurityQueries.SELECT_PROFILE_MENUS)
        this.profileMenus.clear()
        pmRes.rows.forEach((r) => {
            const profileId = this.toPositiveInt(r.profile_id)
            const menuId = this.toPositiveInt(r.menu_id)
            if (!profileId || !menuId) return

            if (!this.profileMenus.has(profileId)) {
                this.profileMenus.set(profileId, new Set())
            }
            this.profileMenus.get(profileId)?.add(menuId)
        })

        // Profile -> Options
        const poRes = await this.db.query<DBProfileAssignment>(
            SecurityQueries.SELECT_PROFILE_OPTIONS
        )
        this.profileOptions.clear()
        poRes.rows.forEach((r) => {
            const profileId = this.toPositiveInt(r.profile_id)
            const optionId = this.toPositiveInt(r.option_id)
            if (!profileId || !optionId) return

            if (!this.profileOptions.has(profileId)) {
                this.profileOptions.set(profileId, new Set())
            }
            this.profileOptions.get(profileId)?.add(optionId)
        })
    }

    /**
     * Retorna la estructura de menús para múltiples perfiles con unión de asignaciones.
     */
    async getStructure(profileIds: number[]): Promise<MenuStructure> {
        // TODO(REVERT_NAMING): Singular tables & N:M profiles
        if (!Array.isArray(profileIds) || profileIds.length === 0) return []

        const assignedSubsystems = new Set<number>()
        const assignedMenus = new Set<number>()
        const assignedOptions = new Set<number>()

        for (const profileId of profileIds) {
            this.profileSubsystems.get(profileId)?.forEach((id) => assignedSubsystems.add(id))
            this.profileMenus.get(profileId)?.forEach((id) => assignedMenus.add(id))
            this.profileOptions.get(profileId)?.forEach((id) => assignedOptions.add(id))
        }

        // If no subsystem assignments, return empty immediately
        if (assignedSubsystems.size === 0) return []

        const structure: MenuStructure = []

        // 1. Iterate over ALL subsystems to maintain defined order
        for (const sub of this.subsystems.values()) {
            if (!assignedSubsystems.has(sub.subsystem_id)) continue

            // Create Subsystem Node
            const subNode: SecuritySubsystem = { ...sub, menus: [] }

            // 2. Find Menus for this subsystem
            for (const menu of this.menus.values()) {
                if (menu.subsystem_id !== sub.subsystem_id) continue
                // Check assignment
                if (!assignedMenus.has(menu.menu_id)) continue

                // Create Menu Node
                const menuNode: SecurityMenu = { ...menu, options: [] }

                // 3. Find Options for this menu
                const optionsForMenu = this.menuOptions.get(menu.menu_id)
                if (optionsForMenu) {
                    for (const optId of optionsForMenu) {
                        // Check assignment
                        if (!assignedOptions.has(optId)) continue

                        const opt = this.options.get(optId)
                        if (opt) {
                            menuNode.options?.push({ ...opt, is_accessible: true })
                        }
                    }
                }

                subNode.menus?.push(menuNode)
            }

            if (subNode.menus && subNode.menus.length > 0) {
                structure.push(subNode)
            }
        }

        return structure
    }

    // --- CRUD: Subsystems ---

    // TODO(REVERT_NAMING): Revert subsystem_na to subsystem_name
    async createSubsystem(name: string): Promise<SecuritySubsystem> {
        const res = await this.db.query<DBSubsystem>(SecurityQueries.INSERT_SUBSYSTEM, [name])
        const row = res.rows[0]
        const newSub: SecuritySubsystem = {
            subsystem_id: row.subsystem_id,
            subsystem_na: row.subsystem_na,
            menus: [],
        }
        this.subsystems.set(newSub.subsystem_id, newSub)
        this.log.info(
            `MenuProvider: Created Subsystem [${newSub.subsystem_id}] ${newSub.subsystem_na}`
        )
        return newSub
    }

    async deleteSubsystem(id: number): Promise<boolean> {
        await this.db.query(SecurityQueries.DELETE_SUBSYSTEM, [id])
        this.subsystems.delete(id)

        // Clean Profile Assignments in memory
        for (const set of this.profileSubsystems.values()) set.delete(id)

        // Reload to ensure deep cleanup consistency
        await this.load()
        return true
    }

    // --- CRUD: Assignment (Profile -> Subsystem) ---

    async assignSubsystem(profileId: number, subsystemId: number): Promise<void> {
        await this.db.query(SecurityQueries.ASSIGN_SUBSYSTEM, [profileId, subsystemId])
        if (!this.profileSubsystems.has(profileId)) this.profileSubsystems.set(profileId, new Set())
        this.profileSubsystems.get(profileId)?.add(subsystemId)
    }

    async revokeSubsystem(profileId: number, subsystemId: number): Promise<void> {
        await this.db.query(SecurityQueries.REVOKE_SUBSYSTEM, [profileId, subsystemId])
        this.profileSubsystems.get(profileId)?.delete(subsystemId)
    }

    // --- CRUD: Menus ---

    async createMenu(name: string, subsystemId: number): Promise<SecurityMenu> {
        const res = await this.db.query<DBMenu>(SecurityQueries.INSERT_MENU, [name, subsystemId])
        const row = res.rows[0]
        // TODO(REVERT_NAMING): Revert menu_na to menu_name
        const newMenu: SecurityMenu = {
            menu_id: row.menu_id,
            menu_na: row.menu_na,
            subsystem_id: row.subsystem_id,
            options: [],
        }
        this.menus.set(newMenu.menu_id, newMenu)
        return newMenu
    }

    async assignMenu(profileId: number, menuId: number): Promise<void> {
        await this.db.query(SecurityQueries.ASSIGN_MENU, [profileId, menuId])
        if (!this.profileMenus.has(profileId)) this.profileMenus.set(profileId, new Set())
        this.profileMenus.get(profileId)?.add(menuId)
    }

    async revokeMenu(profileId: number, menuId: number): Promise<void> {
        await this.db.query(SecurityQueries.REVOKE_MENU, [profileId, menuId])
        this.profileMenus.get(profileId)?.delete(menuId)
    }

    // --- CRUD: Options ---

    async createOption(name: string, methodId?: number): Promise<SecurityOption> {
        const res = await this.db.query<DBOption>(SecurityQueries.INSERT_OPTION, [
            name,
            methodId || null,
        ])
        const row = res.rows[0]
        // TODO(REVERT_NAMING): Revert option_na to option_name
        const newOpt: SecurityOption = {
            option_id: row.option_id,
            option_na: row.option_na,
            method_id: row.method_id ? row.method_id : undefined,
        }
        this.options.set(newOpt.option_id, newOpt)
        return newOpt
    }

    async assignOptionToMenu(menuId: number, optionId: number): Promise<void> {
        await this.db.query(SecurityQueries.ASSIGN_OPTION_TO_MENU, [menuId, optionId])
        if (!this.menuOptions.has(menuId)) this.menuOptions.set(menuId, new Set())
        this.menuOptions.get(menuId)?.add(optionId)
    }

    async assignOptionToProfile(profileId: number, optionId: number): Promise<void> {
        await this.db.query(SecurityQueries.ASSIGN_OPTION_TO_PROFILE, [profileId, optionId])
        if (!this.profileOptions.has(profileId)) this.profileOptions.set(profileId, new Set())
        this.profileOptions.get(profileId)?.add(optionId)
    }

    async revokeOptionFromProfile(profileId: number, optionId: number): Promise<void> {
        await this.db.query(SecurityQueries.REVOKE_OPTION_FROM_PROFILE, [profileId, optionId])
        this.profileOptions.get(profileId)?.delete(optionId)
    }
}
