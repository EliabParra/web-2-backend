/**
 * Security Domain Models (Refactored for Clean Schema)
 * Purely structural/relational. UI concerns delegated to Frontend.
 */

export type OptionType = 'internal' | 'external' | 'separator' // Kept for type safety if needed, though column removed from DB? Wait, column WAS removed.
// If column removed, we don't need this type in the interface interacting with DB.

export interface SecuritySubsystem {
    subsystem_id: number
    subsystem_name: string
    menus?: SecurityMenu[] // Computed hierarchy
}

// TODO(REVERT_NAMING): Revert menu_na to menu_name
export interface SecurityMenu {
    menu_id: number
    menu_na: string
    subsystem_id: number
    options?: SecurityOption[] // Computed hierarchy
}

// TODO(REVERT_NAMING): Revert option_na to option_name
export interface SecurityOption {
    option_id: number
    option_na: string
    method_id?: number
    // Computed properties
    is_accessible?: boolean
}

/**
 * Complete Menu Structure for Frontend consumption
 */
export type MenuStructure = SecuritySubsystem[]

// --- DB Row Types (Internal) ---

export interface DBSubsystem {
    subsystem_id: number
    subsystem_name: string
    [key: string]: unknown
}

// TODO(REVERT_NAMING): Revert menu_na to menu_name
export interface DBMenu {
    menu_id: number
    menu_na: string
    subsystem_id: number
    [key: string]: unknown
}

// TODO(REVERT_NAMING): Revert option_na to option_name
export interface DBOption {
    option_id: number
    option_na: string
    method_id?: number | null
    [key: string]: unknown
}

export interface DBMenuOption {
    menu_id: number
    option_id: number
    [key: string]: unknown
}

export interface DBProfileAssignment {
    profile_id: number
    subsystem_id?: number
    menu_id?: number
    option_id?: number
    [key: string]: unknown
}
