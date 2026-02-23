import type {
    IContainer,
    II18nService,
    ILogger,
    ISecurityService,
    ITransactionMapper,
    ITransactionExecutor,
    IPermissionProvider,
    IMenuProvider,
} from '../types/index.js'
import { MenuStructure } from '../types/security.js'

/**
 * Servicio de seguridad y fachada principal del framework.
 *
 * Coordina los subsistemas de seguridad:
 * - **ITransactionMapper** — Resuelve códigos de transacción a rutas BO/método
 * - **IPermissionProvider** — Verifica permisos con cache en memoria (O(1))
 * - **ITransactionExecutor** — Ejecuta métodos de negocio
 * - **IMenuProvider** — Estructura de menús filtrada por perfil
 *
 * Todas las dependencias se resuelven mediante interfaces del contenedor IoC,
 * respetando el principio de inversión de dependencias (DIP).
 *
 * @example
 * ```typescript
 * const security = container.resolve<ISecurityService>('security')
 * await security.init()
 *
 * const route = security.getDataTx(txCode)
 * if (route && security.getPermissions({ profileId, ...route })) {
 *   const result = await security.executeMethod({ ...route, params })
 * }
 * ```
 */
export class SecurityService implements ISecurityService {
    private mapper: ITransactionMapper
    private guard: IPermissionProvider
    private executor: ITransactionExecutor
    private menuProvider: IMenuProvider

    private i18n: II18nService
    private log: ILogger

    /** Indica si el sistema de seguridad ha cargado correctamente. */
    public isReady: boolean = false

    /** Promesa que resuelve cuando la inicialización completa. */
    public ready!: Promise<boolean>

    /**
     * Crea una instancia de SecurityService.
     *
     * @param container - Contenedor IoC con las dependencias registradas
     */
    constructor(container: IContainer) {
        this.log = container.resolve<ILogger>('log').child({ category: 'Security' })
        this.i18n = container.resolve<II18nService>('i18n')

        this.mapper = container.resolve<ITransactionMapper>('transactionMapper')
        this.executor = container.resolve<ITransactionExecutor>('transactionExecutor')
        this.guard = container.resolve<IPermissionProvider>('permissionGuard')
        this.menuProvider = container.resolve<IMenuProvider>('menuProvider')
    }

    /**
     * Inicializa los subsistemas de seguridad.
     * Carga permisos, mapeos de transacciones y estructura de menús desde la base de datos.
     *
     * @returns `true` si la inicialización fue exitosa
     * @throws Error si falla la carga de datos iniciales
     */
    async init(): Promise<boolean> {
        if (this.ready) return this.ready

        this.ready = (async () => {
            try {
                await Promise.all([this.guard.load(), this.mapper.load(), this.menuProvider.load()])
                this.isReady = true
                return true
            } catch (err: unknown) {
                this.log.error(
                    `${this.i18n.messages.errors.server.serverError.msg}, SecurityService.init: ${err instanceof Error ? err.message : String(err)}`,
                    err as Error
                )
                throw err
            }
        })()

        return this.ready
    }

    /**
     * Resuelve un código de transacción a su ruta de ejecución.
     *
     * @param tx - Código numérico de transacción
     * @returns Objeto `{ objectName, methodName }` o `false` si no existe
     */
    getDataTx(tx: unknown): { objectName: string; methodName: string } | false {
        const route = this.mapper.resolve(tx)
        return route || false
    }

    /**
     * Verifica si un perfil tiene permisos para ejecutar un método de un BO.
     *
     * @param jsonData - Datos de verificación
     * @param jsonData.profileId - ID del perfil del usuario
     * @param jsonData.methodName - Nombre del método a verificar
     * @param jsonData.objectName - Nombre del Business Object
     * @returns `true` si tiene permiso
     */
    getPermissions(jsonData: {
        profileId: number
        methodName: string
        objectName: string
    }): boolean {
        return this.guard.check(jsonData.profileId, jsonData.objectName, jsonData.methodName)
    }

    /**
     * Ejecuta un método de negocio a través del TransactionExecutor.
     *
     * @param jsonData - Datos de ejecución
     * @param jsonData.objectName - Nombre del Business Object
     * @param jsonData.methodName - Nombre del método
     * @param jsonData.params - Parámetros para la función
     * @returns Respuesta estándar con `code` y `msg`
     */
    async executeMethod(jsonData: {
        objectName: string
        methodName: string
        params: Record<string, unknown> | null | undefined
    }): Promise<{ code: number; msg: string; [key: string]: unknown }> {
        try {
            return (await this.executor.execute(
                jsonData.objectName,
                jsonData.methodName,
                jsonData.params
            )) as { code: number; msg: string; [key: string]: unknown }
        } catch (err: unknown) {
            this.log.error(
                `${this.i18n.messages.errors.server.serverError.msg}, SecurityService.executeMethod: ${err instanceof Error ? err.message : String(err)}`,
                {
                    objectName: jsonData.objectName,
                    methodName: jsonData.methodName,
                }
            )
            return this.i18n.messages.errors.server.serverError
        }
    }

    /**
     * Otorga un permiso dinámicamente (Dual Write: DB + memoria).
     *
     * @param profileId - ID del perfil
     * @param objectName - Nombre del Business Object
     * @param methodName - Nombre del método
     * @returns `true` si el permiso se otorgó correctamente
     */
    async grantPermission(
        profileId: number,
        objectName: string,
        methodName: string
    ): Promise<boolean> {
        return this.guard.grant(profileId, objectName, methodName)
    }

    /**
     * Revoca un permiso dinámicamente (Dual Write: DB + memoria).
     *
     * @param profileId - ID del perfil
     * @param objectName - Nombre del Business Object
     * @param methodName - Nombre del método
     * @returns `true` si el permiso se revocó correctamente
     */
    async revokePermission(
        profileId: number,
        objectName: string,
        methodName: string
    ): Promise<boolean> {
        return this.guard.revoke(profileId, objectName, methodName)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Gestión de estructura de menús
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Construye la estructura de menús accesible para un perfil.
     * Filtra subsistemas, menús y opciones según asignaciones.
     *
     * @param profileId - ID del perfil del usuario
     * @returns Árbol de menús filtrado por visibilidad del perfil
     */
    async getMenuStructure(profileId: number): Promise<MenuStructure> {
        return this.menuProvider.getStructure(profileId)
    }

    /**
     * Crea un subsistema en el esquema de seguridad.
     *
     * @param name - Nombre único del subsistema
     * @returns El subsistema creado con su ID asignado
     */
    async createSubsystem(name: string) {
        return this.menuProvider.createSubsystem(name)
    }

    /**
     * Elimina un subsistema y sus asignaciones relacionadas.
     *
     * @param id - ID del subsistema a eliminar
     * @returns `true` si se eliminó correctamente
     */
    async deleteSubsystem(id: number) {
        return this.menuProvider.deleteSubsystem(id)
    }

    /**
     * Asigna un subsistema a un perfil (visibilidad).
     *
     * @param profileId - ID del perfil
     * @param subsystemId - ID del subsistema
     */
    async assignSubsystem(profileId: number, subsystemId: number) {
        return this.menuProvider.assignSubsystem(profileId, subsystemId)
    }

    /**
     * Revoca la asignación de un subsistema a un perfil.
     *
     * @param profileId - ID del perfil
     * @param subsystemId - ID del subsistema
     */
    async revokeSubsystem(profileId: number, subsystemId: number) {
        return this.menuProvider.revokeSubsystem(profileId, subsystemId)
    }

    /**
     * Crea un menú dentro de un subsistema.
     *
     * @param name - Nombre del menú
     * @param subsystemId - ID del subsistema padre
     * @returns El menú creado con su ID asignado
     */
    async createMenu(name: string, subsystemId: number) {
        return this.menuProvider.createMenu(name, subsystemId)
    }

    /**
     * Asigna un menú a un perfil (visibilidad).
     *
     * @param profileId - ID del perfil
     * @param menuId - ID del menú
     */
    async assignMenu(profileId: number, menuId: number) {
        return this.menuProvider.assignMenu(profileId, menuId)
    }

    /**
     * Revoca la asignación de un menú a un perfil.
     *
     * @param profileId - ID del perfil
     * @param menuId - ID del menú
     */
    async revokeMenu(profileId: number, menuId: number) {
        return this.menuProvider.revokeMenu(profileId, menuId)
    }

    /**
     * Crea una opción de menú, opcionalmente enlazada a un método.
     *
     * @param name - Nombre de la opción
     * @param methodId - ID del método asociado (opcional)
     * @returns La opción creada con su ID asignado
     */
    async createOption(name: string, methodId?: number) {
        return this.menuProvider.createOption(name, methodId)
    }

    /**
     * Enlaza una opción a un menú.
     *
     * @param menuId - ID del menú
     * @param optionId - ID de la opción
     */
    async assignOptionToMenu(menuId: number, optionId: number) {
        return this.menuProvider.assignOptionToMenu(menuId, optionId)
    }

    /**
     * Asigna una opción a un perfil (visibilidad).
     *
     * @param profileId - ID del perfil
     * @param optionId - ID de la opción
     */
    async assignOptionToProfile(profileId: number, optionId: number) {
        return this.menuProvider.assignOptionToProfile(profileId, optionId)
    }

    /**
     * Revoca la asignación de una opción a un perfil.
     *
     * @param profileId - ID del perfil
     * @param optionId - ID de la opción
     */
    async revokeOptionFromProfile(profileId: number, optionId: number) {
        return this.menuProvider.revokeOptionFromProfile(profileId, optionId)
    }
}
