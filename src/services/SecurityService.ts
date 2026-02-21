import type { IContainer, II18nService, ILogger, ISecurityService } from '../types/index.js'
import { TransactionMapper } from '../core/transaction/TransactionMapper.js'
import { PermissionGuard } from '../core/security/PermissionGuard.js'
import { MenuProvider } from '../core/security/MenuProvider.js'
import { TransactionExecutor } from '../core/transaction/TransactionExecutor.js'
import { MenuStructure } from '../types/security.js'
import { TransactionOrchestrator } from '../core/transaction/TransactionOrchestrator.js'
import { AuthorizationService } from '../core/security/AuthorizationService.js'

/**
 * Servicio de seguridad y orquestador principal del framework.
 *
 * Responsable de coordinar el flujo de transacción:
 * 1. Inicializa componentes (Mapper, Guard, Executor)
 * 2. Mapea códigos de transacción (tx) a métodos (TransactionMapper)
 * 3. Verifica permisos de acceso (PermissionGuard)
 * 4. Ejecuta la lógica de negocio (TransactionExecutor)
 *
 * @example
 * ```typescript
 * const security = new SecurityService(container)
 * await security.init() // Carga permisos y mapeos
 *
 * // Uso típico en Dispatcher:
 * const route = security.getDataTx('TX_CODE')
 * if (security.getPermissions({ profile_id: 1, ...route })) {
 *   const result = await security.executeMethod({ ...route, params })
 * }
 * ```
 */
export class SecurityService implements ISecurityService {
    private mapper: TransactionMapper
    private guard: PermissionGuard
    private executor: TransactionExecutor
    private menuProvider: MenuProvider
    private orchestrator: TransactionOrchestrator
    private auth: AuthorizationService

    private i18n: II18nService
    private log: ILogger

    /** Indica si el sistema de seguridad ha cargado correctamente */
    public isReady: boolean = false
    /** Promesa que resuelve cuando la inicialización completa */
    public ready!: Promise<boolean>

    /**
     * Crea una instancia de SecurityService.
     *
     * @param container - Contenedor IoC con las dependencias registradas
     */
    constructor(container: IContainer) {
        this.log = container.resolve<ILogger>('log').child({ category: 'Security' })
        this.i18n = container.resolve<II18nService>('i18n')

        // Resolve dependencies explicitly from the DI container (IoC)
        this.orchestrator = container.resolve<TransactionOrchestrator>('orchestrator')
        this.mapper = container.resolve<TransactionMapper>('transactionMapper')
        this.executor = container.resolve<TransactionExecutor>('transactionExecutor')
        this.guard = container.resolve<PermissionGuard>('permissionGuard')
        this.menuProvider = container.resolve<MenuProvider>('menuProvider')
        this.auth = container.resolve<AuthorizationService>('authorization')
    }

    /**
     * Inicializa los subsistemas de seguridad (Mapper y Guard).
     * Carga permisos y mapeos desde la base de datos.
     *
     * @returns {Promise<boolean>} True si la inicialización fue exitosa
     * @throws {Error} Si falla la carga de datos iniciales
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
     * Resuelve un código de transacción a su ruta de ejecución (BO y método).
     *
     * @param tx - Código de transacción (e.g., "AUTH_LOGIN")
     * @returns {{ objectName: string; methodName: string } | false} Objeto con ruta o false si no existe
     */
    getDataTx(tx: unknown): { objectName: string; methodName: string } | false {
        const route = this.mapper.resolve(tx)
        return route || false
    }

    /**
     * Verifica si un perfil tiene permisos para ejecutar un método.
     *
     * @param jsonData - Datos para verificación
     * @param jsonData.profileId - ID del perfil del usuario (was profile_id)
     * @param jsonData.methodName - Nombre del método (was method_na)
     * @param jsonData.objectName - Nombre del Business Object (was object_na)
     * @returns {boolean} True si tiene permiso, False en caso contrario
     */
    getPermissions(jsonData: {
        profileId: number
        methodName: string
        objectName: string
    }): boolean {
        return this.guard.check(jsonData.profileId, jsonData.objectName, jsonData.methodName)
    }

    /**
     * Ejecuta un método de negocio a través del Executor.
     *
     * @param jsonData - Datos de ejecución
     * @param jsonData.objectName - Nombre del Business Object
     * @param jsonData.methodName - Nombre del método
     * @param jsonData.params - Parámetros para la función
     * @returns Resultado de la ejecución
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
     * Otorga un permiso dinámicamente (Dual Write).
     * Delegado al PermissionGuard para consistencia DB-Memoria.
     */
    async grantPermission(
        profileId: number,
        objectName: string,
        methodName: string
    ): Promise<boolean> {
        return this.guard.grant(profileId, objectName, methodName)
    }

    /**
     * Revoca un permiso dinámicamente (Dual Write).
     * Delegado al PermissionGuard para consistencia DB-Memoria.
     */
    async revokePermission(
        profileId: number,
        objectName: string,
        methodName: string
    ): Promise<boolean> {
        return this.guard.revoke(profileId, objectName, methodName)
    }

    /**
     * Construye y retorna la estructura de menús accesible para el perfil.
     * Filtra opciones según permisos.
     */
    async getMenuStructure(profileId: number): Promise<MenuStructure> {
        return this.menuProvider.getStructure(profileId)
    }

    // --- Security Structure Management API ---

    /**
     * Crea un subsistema.
     */
    async createSubsystem(name: string) {
        return this.menuProvider.createSubsystem(name)
    }

    /**
     * Elimina un subsistema.
     */
    async deleteSubsystem(id: number) {
        return this.menuProvider.deleteSubsystem(id)
    }

    /**
     * Asigna un subsistema a un perfil.
     */
    async assignSubsystem(profileId: number, subsystemId: number) {
        return this.menuProvider.assignSubsystem(profileId, subsystemId)
    }

    /**
     * Revoca un subsistema a un perfil.
     */
    async revokeSubsystem(profileId: number, subsystemId: number) {
        return this.menuProvider.revokeSubsystem(profileId, subsystemId)
    }

    /**
     * Crea un menú.
     */
    async createMenu(name: string, subsystemId: number) {
        return this.menuProvider.createMenu(name, subsystemId)
    }

    /**
     * Asigna un menú a un perfil.
     */
    async assignMenu(profileId: number, menuId: number) {
        return this.menuProvider.assignMenu(profileId, menuId)
    }

    /**
     * Revoca un menú a un perfil.
     */
    async revokeMenu(profileId: number, menuId: number) {
        return this.menuProvider.revokeMenu(profileId, menuId)
    }

    /**
     * Crea una opción.
     */
    async createOption(name: string, methodId?: number) {
        return this.menuProvider.createOption(name, methodId)
    }

    /**
     * Asigna una opción a un menú.
     */
    async assignOptionToMenu(menuId: number, optionId: number) {
        return this.menuProvider.assignOptionToMenu(menuId, optionId)
    }

    /**
     * Asigna una opción a un perfil.
     */
    async assignOptionToProfile(profileId: number, optionId: number) {
        return this.menuProvider.assignOptionToProfile(profileId, optionId)
    }

    /**
     * Revoca una opción a un perfil.
     */
    async revokeOptionFromProfile(profileId: number, optionId: number) {
        return this.menuProvider.revokeOptionFromProfile(profileId, optionId)
    }

    /**
     * Devuelve la instancia interna del PermissionGuard.
     * Útil para inyectar en otros servicios (e.g. AuthorizationService).
     */
    getGuard(): PermissionGuard {
        return this.guard
    }

    /**
     * Devuelve la instancia interna del TransactionMapper.
     * Útil para inyectar en TransactionOrchestrator.
     */
    getMapper(): TransactionMapper {
        return this.mapper
    }

    /**
     * Devuelve la instancia interna del MenuProvider.
     * Útil para inyectar en otros servicios.
     */
    getMenuProvider(): MenuProvider {
        return this.menuProvider
    }

    /**
     * Devuelve la instancia interna del TransactionExecutor.
     * Útil para inyectar en otros servicios.
     */
    getExecutor(): TransactionExecutor {
        return this.executor
    }

    /**
     * Devuelve la instancia interna del TransactionOrchestrator.
     * Útil para inyectar en otros servicios.
     */
    getOrchestrator(): TransactionOrchestrator {
        return this.orchestrator
    }

    /**
     * Devuelve la instancia interna del AuthorizationService.
     * Útil para inyectar en otros servicios.
     */
    getAuth(): AuthorizationService {
        return this.auth
    }
}
