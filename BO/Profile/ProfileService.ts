import { BOService } from '@toproc/bo'
import type { IContainer, ISecurityService } from '@toproc/types'
import { ProfileRepository, Errors, Types } from './ProfileModule.js'

/**
 * Capa de servicio para lógica de negocio de Profile.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./ProfileErrors.js
 */
export class ProfileService extends BOService implements Types.IProfileService {
    private repo: ProfileRepository
    private security: ISecurityService

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<ProfileRepository>('ProfileRepository')
        this.security = container.resolve<ISecurityService>('security')
    }

    /**
     * Obtiene todos los profiles
     */
    async getAll(filters?: Types.GetAllProfileInput): Promise<Types.ProfileSummary[]> {
        return this.repo.findAll(filters)
    }

    /**
     * Obtiene profile por ID
     * @throws ProfileNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Profile> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.ProfileNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo profile
     */
    async create(data: Partial<Types.Profile>): Promise<Types.Profile> {
        this.log.trace('Creando profile')
        return this.repo.create(data)
    }

    /**
     * Actualiza profile
     * @throws ProfileNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Profile>): Promise<Types.Profile> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.ProfileNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina profile
     * @throws ProfileNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.ProfileNotFoundError(id)
        }
        this.log.info('Eliminado profile ' + id)
    }

    async grantPermission(data: Types.Profile.PermissionInput): Promise<boolean> {
        return this.security.grantPermission(data.profile_id, data.object_na, data.method_na)
    }

    async revokePermission(data: Types.Profile.PermissionInput): Promise<boolean> {
        return this.security.revokePermission(data.profile_id, data.object_na, data.method_na)
    }

    async assignSubsystem(data: Types.Profile.SubsystemAssignmentInput): Promise<void> {
        await this.security.assignSubsystem(data.profile_id, data.subsystem_id)
    }

    async revokeSubsystem(data: Types.Profile.SubsystemAssignmentInput): Promise<void> {
        await this.security.revokeSubsystem(data.profile_id, data.subsystem_id)
    }

    async assignMenu(data: Types.Profile.MenuAssignmentInput): Promise<void> {
        await this.security.assignMenu(data.profile_id, data.menu_id)
    }

    async revokeMenu(data: Types.Profile.MenuAssignmentInput): Promise<void> {
        await this.security.revokeMenu(data.profile_id, data.menu_id)
    }

    async assignOption(data: Types.Profile.OptionAssignmentInput): Promise<void> {
        await this.security.assignOptionToProfile(data.profile_id, data.option_id)
    }

    async revokeOption(data: Types.Profile.OptionAssignmentInput): Promise<void> {
        await this.security.revokeOptionFromProfile(data.profile_id, data.option_id)
    }
}
