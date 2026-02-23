import { IDatabase, ILogger, IContainer, IMenuProvider } from '../../types/core.js'
import {
    SecuritySubsystem,
    SecurityMenu,
    SecurityOption,
    MenuStructure,
    DBSubsystem,
    DBMenu,
    DBOption,
    DBMenuOption,
    DBProfileAssignment,
} from '../../types/security.js'
import { SecurityQueries } from './SecurityQueries.js'

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
        subRes.rows.forEach((r) =>
            this.subsystems.set(r.subsystem_id, {
                subsystem_id: r.subsystem_id,
                subsystem_name: r.subsystem_name,
                menus: [],
            })
        )

        // Menus
        const menuRes = await this.db.query<DBMenu>(SecurityQueries.SELECT_MENUS)
        this.menus.clear()
        menuRes.rows.forEach((r) =>
            this.menus.set(r.menu_id, {
                menu_id: r.menu_id,
                menu_name: r.menu_name,
                subsystem_id: r.subsystem_id,
                options: [],
            })
        )

        // Options
        const optRes = await this.db.query<DBOption>(SecurityQueries.SELECT_OPTIONS)
        this.options.clear()
        optRes.rows.forEach((r) =>
            this.options.set(r.option_id, {
                option_id: r.option_id,
                option_name: r.option_name,
                method_id: r.method_id || undefined,
            })
        )

        // Menu-Option Relations
        const moRes = await this.db.query<DBMenuOption>(SecurityQueries.SELECT_MENU_OPTIONS)
        this.menuOptions.clear()
        moRes.rows.forEach((r) => {
            if (!this.menuOptions.has(r.menu_id)) this.menuOptions.set(r.menu_id, new Set())
            this.menuOptions.get(r.menu_id)?.add(r.option_id)
        })
    }

    private async loadAssignments() {
        // Profile -> Subsystems
        const psRes = await this.db.query<DBProfileAssignment>(
            SecurityQueries.SELECT_PROFILE_SUBSYSTEMS
        )
        this.profileSubsystems.clear()
        psRes.rows.forEach((r) => {
            if (r.subsystem_id) {
                if (!this.profileSubsystems.has(r.profile_id))
                    this.profileSubsystems.set(r.profile_id, new Set())
                this.profileSubsystems.get(r.profile_id)?.add(r.subsystem_id)
            }
        })

        // Profile -> Menus
        const pmRes = await this.db.query<DBProfileAssignment>(SecurityQueries.SELECT_PROFILE_MENUS)
        this.profileMenus.clear()
        pmRes.rows.forEach((r) => {
            if (r.menu_id) {
                if (!this.profileMenus.has(r.profile_id))
                    this.profileMenus.set(r.profile_id, new Set())
                this.profileMenus.get(r.profile_id)?.add(r.menu_id)
            }
        })

        // Profile -> Options
        const poRes = await this.db.query<DBProfileAssignment>(
            SecurityQueries.SELECT_PROFILE_OPTIONS
        )
        this.profileOptions.clear()
        poRes.rows.forEach((r) => {
            if (r.option_id) {
                if (!this.profileOptions.has(r.profile_id))
                    this.profileOptions.set(r.profile_id, new Set())
                this.profileOptions.get(r.profile_id)?.add(r.option_id)
            }
        })
    }

    /**
     * Retorna la estructura de menús para un perfil basada en asignaciones explícitas.
     */
    async getStructure(profileId: number): Promise<MenuStructure> {
        const assignedSubsystems = this.profileSubsystems.get(profileId)
        const assignedMenus = this.profileMenus.get(profileId)
        const assignedOptions = this.profileOptions.get(profileId)

        // If no subsystem assignments, return empty immediately
        if (!assignedSubsystems || assignedSubsystems.size === 0) return []

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
                if (!assignedMenus || !assignedMenus.has(menu.menu_id)) continue

                // Create Menu Node
                const menuNode: SecurityMenu = { ...menu, options: [] }

                // 3. Find Options for this menu
                const optionsForMenu = this.menuOptions.get(menu.menu_id)
                if (optionsForMenu) {
                    for (const optId of optionsForMenu) {
                        // Check assignment
                        if (!assignedOptions || !assignedOptions.has(optId)) continue

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

    async createSubsystem(name: string): Promise<SecuritySubsystem> {
        const res = await this.db.query<DBSubsystem>(SecurityQueries.INSERT_SUBSYSTEM, [name])
        const row = res.rows[0]
        const newSub: SecuritySubsystem = {
            subsystem_id: row.subsystem_id,
            subsystem_name: row.subsystem_name,
            menus: [],
        }
        this.subsystems.set(newSub.subsystem_id, newSub)
        this.log.info(
            `MenuProvider: Created Subsystem [${newSub.subsystem_id}] ${newSub.subsystem_name}`
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
        const newMenu: SecurityMenu = {
            menu_id: row.menu_id,
            menu_name: row.menu_name,
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
        const newOpt: SecurityOption = {
            option_id: row.option_id,
            option_name: row.option_name,
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
