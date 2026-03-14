import { IDatabase, ILogger, IPermissionProvider, IContainer } from '../../types/core.js'
import { SecurityQueries } from '../../services/queries/security.js'

/**
 * Guardián de permisos basado en base de datos.
 *
 * Implementa el patrón "Cache-Aside" cargando todos los permisos en memoria al inicio
 * para permitir verificaciones síncronas de alta velocidad durante las transacciones.
 *
 * @class PermissionGuard
 * @implements {IPermissionProvider}
 */
export class PermissionGuard implements IPermissionProvider {
    private db: IDatabase
    private log: ILogger
    // Usamos un Set de strings "profileId:objectName:methodName" para búsqueda O(1)
    private permissions: Set<string> = new Set()

    /**
     * Crea una instancia de PermissionGuard.
     *
     * @param container - Contenedor de dependencias
     */
    constructor(container: IContainer) {
        this.db = container.resolve<IDatabase>('db')
        this.log = container.resolve<ILogger>('log').child({ category: 'PermissionGuard' })
    }

    /**
     * Carga/Recarga la matriz de permisos desde la base de datos.
     * Construye un índice en memoria para verificaciones rápidas.
     *
     * @returns {Promise<void>} Promesa que resuelve al completar la carga
     * @throws {Error} Si falla la consulta a base de datos
     */
    async load(): Promise<void> {
        try {
            // Updated to use SecurityQueries.loadPermissions (new schema)
            // TODO(REVERT_NAMING): Revert object_na to object_name, method_na to method_name
            const res = await this.db.query<{
                profile_id: number
                object_na: string
                method_na: string
            }>(SecurityQueries.loadPermissions)

            const nextPermissions = new Set<string>()

            if (res && res.rows) {
                for (const row of res.rows) {
                    const key = this.buildKey(
                        Number(row.profile_id),
                        String(row.object_na), // TODO(REVERT_NAMING): Revert to row.object_name
                        String(row.method_na) // TODO(REVERT_NAMING): Revert to row.method_name
                    )
                    nextPermissions.add(key)
                }
            }

            this.permissions = nextPermissions

            this.log.info(`PermissionGuard: Cargados ${this.permissions.size} permisos en memoria`)
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            this.log.error(`PermissionGuard: Fallo al cargar permisos: ${errorMsg}`)
            throw err
        }
    }

    /**
     * Verifica si al menos uno de los perfiles tiene permiso de ejecución.
     *
     * @param profileIds - Lista de perfiles asociados al usuario
     * @param objectName - Nombre del Business Object (ej. 'Auth')
     * @param methodName - Nombre del método (ej. 'login')
     * @returns {boolean} true si existe permiso para cualquier perfil del arreglo
     */
    check(profileIds: number[], objectName: string, methodName: string): boolean {
        // TODO(REVERT_NAMING): Singular tables & N:M profiles
        if (!objectName || !methodName || !Array.isArray(profileIds) || profileIds.length === 0) {
            return false
        }

        for (const profileId of profileIds) {
            if (!Number.isInteger(profileId)) continue
            const key = this.buildKey(profileId, objectName, methodName)
            if (this.permissions.has(key)) return true
        }

        return false
    }

    /**
     * Otorga un permiso dinámicamente (Dual Write).
     */
    async grant(profileId: number, objectName: string, methodName: string): Promise<boolean> {
        try {
            // 1. Write to DB
            const res = await this.db.query(SecurityQueries.grantPermission, [
                profileId,
                objectName,
                methodName,
            ])

            // Check if insert was successful (method/object existing)
            if (!res.rowCount && (!res.rows || res.rows.length === 0)) {
                this.log.warn(
                    `Grant failed: Method ${objectName}.${methodName} not found or permission already exists`
                )
                return false
            }

            // 2. Update Memory
            const key = this.buildKey(profileId, objectName, methodName)
            this.permissions.add(key)

            this.log.info(`Permission granted: ${key}`)
            return true
        } catch (err) {
            this.log.error(`Failed to grant permission: ${err}`)
            return false
        }
    }

    /**
     * Revoca un permiso dinámicamente (Dual Write).
     */
    async revoke(profileId: number, objectName: string, methodName: string): Promise<boolean> {
        try {
            // 1. Write to DB
            const res = await this.db.query(SecurityQueries.revokePermission, [
                profileId,
                objectName,
                methodName,
            ])

            // Check if delete was successful
            if (!res.rowCount && (!res.rows || res.rows.length === 0)) {
                this.log.warn(
                    `Revoke failed: Method ${objectName}.${methodName} not found or permission did not exist`
                )
                return false
            }

            // 2. Update Memory
            const key = this.buildKey(profileId, objectName, methodName)
            this.permissions.delete(key)

            this.log.info(`Permission revoked: ${key}`)
            return true
        } catch (err) {
            this.log.error(`Failed to revoke permission: ${err}`)
            return false
        }
    }

    /**
     * Construye la clave única para el Set de permisos.
     * Formato: `profile_id:object_name:method_name`
     */
    private buildKey(profileId: number, objectName: string, methodName: string): string {
        return `${profileId}:${objectName}:${methodName}`
    }
}
