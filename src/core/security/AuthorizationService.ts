import { IPermissionProvider, ILogger, IContainer } from '../../types/core.js'

/**
 * Servicio de Autorización.
 *
 * Responsable exclusivo de determinar si un actor (usuario/sistema) tiene permiso
 * para realizar una acción sobre un recurso.
 *
 * Evolución del antiguo SecurityService, enfocado únicamente en la "Autorización" (AuthZ),
 * delegando la orquestación de transacciones al TransactionOrchestrator.
 *
 * @class AuthorizationService
 */
export class AuthorizationService {
    private guard: IPermissionProvider
    private log: ILogger

    /**
     * Crea una instancia de AuthorizationService.
     *
     * @param container - Contenedor de dependencias
     */
    constructor(container: IContainer) {
        this.guard = container.resolve<IPermissionProvider>('permissionGuard')
        this.log = container.resolve<ILogger>('log').child({ category: 'Authorization' })
    }

    /**
     * Inicializa el servicio cargando los permisos.
     */
    async init(): Promise<void> {
        await this.guard.load()
    }

    /**
     * Verifica si alguno de los perfiles está autorizado para ejecutar un método de un objeto.
     * Registra intentos denegados para auditoría (vía log por ahora, audit service futuro).
     *
     * @param profileIds - IDs de perfiles del usuario
     * @param objectName - Nombre del recurso/objeto
     * @param methodName - Acción/Método a ejecutar
     * @returns {boolean} true si está autorizado, false si no
     */
    isAuthorized(profileIds: number[], objectName: string, methodName: string): boolean {
        // TODO(REVERT_NAMING): Singular tables & N:M profiles
        const authorized = this.guard.check(profileIds, objectName, methodName)

        if (!authorized) {
            this.log.warn(
                `AUTHZ: Access Denied for Profiles [${profileIds.join(',')}] on ${objectName}.${methodName}`,
                { profileIds, objectName, methodName }
            )
        }

        return authorized
    }
}
