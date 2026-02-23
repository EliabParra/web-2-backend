/**
 * Tipos para el módulo de importación/exportación Excel de la matriz de permisos.
 *
 * @module types/excel
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Schemas Zod — Validación de filas del Excel
// ═══════════════════════════════════════════════════════════════════════════════

/** Schema de validación para filas de la hoja Perfiles. */
export const ProfileRowSchema = z.object({
    profile_name: z.string().min(1, 'profile_name es requerido').max(100),
})

/** Schema de validación para filas de la hoja Usuarios. */
export const UserRowSchema = z.object({
    username: z.string().min(1, 'username es requerido').max(100),
    password: z.string().min(1, 'password es requerido').max(200),
    profile_name: z.string().min(1, 'profile_name es requerido').max(100),
})

/** Schema de validación para filas de la hoja Subsistemas. */
export const SubsystemRowSchema = z.object({
    subsystem_name: z.string().min(1, 'subsystem_name es requerido').max(100),
})

/** Schema de validación para filas de la hoja Menús. */
export const MenuRowSchema = z.object({
    menu_name: z.string().min(1, 'menu_name es requerido').max(100),
    subsystem_name: z.string().min(1, 'subsystem_name es requerido').max(100),
})

/** Schema de validación para filas de la hoja Objetos. */
export const ObjectRowSchema = z.object({
    object_name: z.string().min(1, 'object_name es requerido').max(100)
        .regex(/^[A-Za-z_]\w*$/, 'Solo alfanuméricos y guiones bajos'),
})

/** Schema de validación para filas de la hoja Métodos. */
export const MethodRowSchema = z.object({
    object_name: z.string().min(1, 'object_name es requerido').max(100),
    method_name: z.string().min(1, 'method_name es requerido').max(100)
        .regex(/^[A-Za-z_]\w*$/, 'Solo alfanuméricos y guiones bajos'),
})

/** Schema de validación para filas de la hoja Opciones. */
export const OptionRowSchema = z.object({
    option_name: z.string().min(1, 'option_name es requerido').max(100),
    object_method: z.string().max(200).default(''),
    menu_name: z.string().max(100).default(''),
})

/**
 * Schema de validación para el campo object_method.
 * Formato: "NombreObjeto.nombreMetodo" (solo alfanuméricos y guiones bajos).
 */
export const ObjectMethodSchema = z
    .string()
    .regex(/^[A-Za-z_]\w*\.[A-Za-z_]\w*$/, 'Formato inválido: use "Objeto.metodo"')

/** Schema de validación para filas de la hoja Permisos. */
export const PermissionRowSchema = z.object({
    profile_name: z.string().min(1, 'profile_name es requerido').max(100),
    object_method: ObjectMethodSchema,
})

/** Schema de validación para filas de la hoja Asignaciones. */
export const AssignmentRowSchema = z.object({
    profile_name: z.string().min(1, 'profile_name es requerido').max(100),
    subsystem_name: z.string().min(1, 'subsystem_name es requerido').max(100),
    menu_name: z.string().max(100).default(''),
    option_name: z.string().max(100).default(''),
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Tipos derivados de los schemas
// ═══════════════════════════════════════════════════════════════════════════════

/** Datos validados de una fila de la hoja Perfiles. */
export type ProfileRow = z.infer<typeof ProfileRowSchema>

/** Datos validados de una fila de la hoja Usuarios. */
export type UserRow = z.infer<typeof UserRowSchema>

/** Datos validados de una fila de la hoja Subsistemas. */
export type SubsystemRow = z.infer<typeof SubsystemRowSchema>

/** Datos validados de una fila de la hoja Objetos. */
export type ObjectRow = z.infer<typeof ObjectRowSchema>

/** Datos validados de una fila de la hoja Métodos. */
export type MethodRow = z.infer<typeof MethodRowSchema>

/** Datos validados de una fila de la hoja Menús. */
export type MenuRow = z.infer<typeof MenuRowSchema>

/** Datos validados de una fila de la hoja Opciones. */
export type OptionRow = z.infer<typeof OptionRowSchema>

/** Datos validados de una fila de la hoja Permisos. */
export type PermissionRow = z.infer<typeof PermissionRowSchema>

/** Datos validados de una fila de la hoja Asignaciones. */
export type AssignmentRow = z.infer<typeof AssignmentRowSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Resultado de importación
// ═══════════════════════════════════════════════════════════════════════════════

/** Resultado de una operación de importación Excel. */
export interface ImportResult {
    /** Indica si la importación fue exitosa (sin errores). */
    success: boolean
    /** Resumen de registros procesados por hoja. */
    summary: SheetSummary[]
    /** Errores de validación encontrados. */
    errors: ImportError[]
}

/** Resumen de procesamiento de una hoja individual. */
export interface SheetSummary {
    /** Nombre de la hoja. */
    sheet: string
    /** Total de filas procesadas. */
    processed: number
    /** Filas insertadas exitosamente. */
    inserted: number
    /** Filas omitidas (duplicados o sin cambios). */
    skipped: number
}

/** Error de validación en una fila específica de una hoja. */
export interface ImportError {
    /** Nombre de la hoja donde ocurrió el error. */
    sheet: string
    /** Número de fila (1-indexed, incluyendo header). */
    row: number
    /** Columna donde se detectó el problema. */
    column: string
    /** Mensaje descriptivo del error. */
    message: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generador de archivos Excel para la matriz de permisos.
 * Implementado por `PermissionMatrixWriter`.
 */
export interface IPermissionMatrixWriter {
    /** Genera una plantilla vacía con headers, estilos e instrucciones. */
    generateTemplate(): Promise<Buffer>
    /** Exporta los datos existentes de seguridad a un workbook Excel. */
    exportData(): Promise<Buffer>
}

/**
 * Lector e importador de archivos Excel para la matriz de permisos.
 * Implementado por `PermissionMatrixReader`.
 */
export interface IPermissionMatrixReader {
    /**
     * Importa datos desde un buffer Excel a la base de datos.
     *
     * @param buffer - Buffer del archivo Excel
     * @returns Resultado con resumen por hoja y errores de validación
     */
    import(buffer: Buffer): Promise<ImportResult>
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Definiciones de hojas
// ═══════════════════════════════════════════════════════════════════════════════

/** Definición de las hojas disponibles para el Excel. */
export const SHEET_DEFINITIONS = {
    PROFILES: { name: 'Perfiles', columns: ['profile_name'] },
    USERS: { name: 'Usuarios', columns: ['username', 'password', 'profile_name'] },
    SUBSYSTEMS: { name: 'Subsistemas', columns: ['subsystem_name'] },
    OBJECTS: { name: 'Objetos', columns: ['object_name'] },
    METHODS: { name: 'Métodos', columns: ['object_name', 'method_name'] },
    MENUS: { name: 'Menús', columns: ['menu_name', 'subsystem_name'] },
    OPTIONS: { name: 'Opciones', columns: ['option_name', 'object_method', 'menu_name'] },
    PERMISSIONS: { name: 'Permisos', columns: ['profile_name', 'object_method'] },
    ASSIGNMENTS: {
        name: 'Asignaciones',
        columns: ['profile_name', 'subsystem_name', 'menu_name', 'option_name'],
    },
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Tipos internos para consultas tipadas
// ═══════════════════════════════════════════════════════════════════════════════

/** Fila con profile_name devuelta por queries. */
export interface ProfileNameRow { [key: string]: unknown; profile_name: string }

/** Fila con subsystem_name devuelta por queries. */
export interface SubsystemNameRow { [key: string]: unknown; subsystem_name: string }

/** Fila con menu_name devuelta por queries. */
export interface MenuNameRow { [key: string]: unknown; menu_name: string }

/** Fila con object_method devuelta por queries. */
export interface ObjectMethodRow { [key: string]: unknown; object_method: string }

/** Fila de usuario exportada con profile_name. */
export interface UserExportRow { [key: string]: unknown; username: string; password: string; profile_name: string }

/** Fila de menú exportada con subsystem_name. */
export interface MenuExportRow { [key: string]: unknown; menu_name: string; subsystem_name: string }

/** Fila de opción exportada con object_method y menu_name. */
export interface OptionExportRow { [key: string]: unknown; option_name: string; object_method: string; menu_name: string }

/** Fila de permiso exportada. */
export interface PermissionExportRow { [key: string]: unknown; profile_name: string; object_method: string }

/** Fila de asignación exportada. */
export interface AssignmentExportRow { [key: string]: unknown; profile_name: string; subsystem_name: string; menu_name: string; option_name: string }

/** Fila de objeto exportada. */
export interface ObjectNameExportRow { [key: string]: unknown; object_name: string }

/** Fila de método exportada con object_name. */
export interface MethodExportRow { [key: string]: unknown; object_name: string; method_name: string }

/** Fila con object_id. */
export interface ObjectIdRow { [key: string]: unknown; object_id: number }

/** Fila con profile_id. */
export interface ProfileIdRow { [key: string]: unknown; profile_id: number }

/** Fila con subsystem_id. */
export interface SubsystemIdRow { [key: string]: unknown; subsystem_id: number }

/** Fila con menu_id. */
export interface MenuIdRow { [key: string]: unknown; menu_id: number }

/** Fila con method_id. */
export interface MethodIdRow { [key: string]: unknown; method_id: number }

/** Fila con option_id. */
export interface OptionIdRow { [key: string]: unknown; option_id: number }

/** Fila con profile_method_id de retorno. */
export interface ProfileMethodIdRow { [key: string]: unknown; profile_method_id: number }

