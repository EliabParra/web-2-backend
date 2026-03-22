import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { GroupRepository, Errors, Types } from './GroupModule.js'

/**
 * Capa de servicio para lógica de negocio de Group.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./GroupErrors.js
 */
export class GroupService extends BOService implements Types.IGroupService {
    private repo: GroupRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<GroupRepository>('GroupRepository')
    }

    /**
     * Obtiene todos los groups
     */
    async getAll(): Promise<Types.GroupSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene group por ID
     * @throws GroupNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Group> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.GroupNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo group
     */
    async create(data: Partial<Types.Group>): Promise<Types.Group> {
        this.log.info('Creando group')
        return this.repo.create(data)
    }

    /**
     * Actualiza group
     * @throws GroupNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Group>): Promise<Types.Group> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.GroupNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina group
     * @throws GroupNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.GroupNotFoundError(id)
        }
        this.log.info('Eliminado group ' + id)
    }
}
