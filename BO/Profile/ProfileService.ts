import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { ProfileRepository, Errors, Types } from './ProfileModule.js'

/**
 * Capa de servicio para lógica de negocio de Profile.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./ProfileErrors.js
 */
export class ProfileService extends BOService implements Types.IProfileService {
    private repo: ProfileRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<ProfileRepository>('ProfileRepository')
    }

    /**
     * Obtiene todos los profiles
     */
    async getAll(): Promise<Types.ProfileSummary[]> {
        return this.repo.findAll()
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
        this.log.info('Creando profile')
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
}
