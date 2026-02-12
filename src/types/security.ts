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

export interface SecurityMenu {
    menu_id: number
    menu_name: string
    subsystem_id: number
    options?: SecurityOption[] // Computed hierarchy
}

export interface SecurityOption {
    option_id: number
    option_name: string
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

export interface DBMenu {
    menu_id: number
    menu_name: string
    subsystem_id: number
    [key: string]: unknown
}

export interface DBOption {
    option_id: number
    option_name: string
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
