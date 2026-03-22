import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { DevolutionRepository, Errors, Types } from './DevolutionModule.js'

/**
 * Capa de servicio para lógica de negocio de Devolution.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./DevolutionErrors.js
 */
export class DevolutionService extends BOService implements Types.IDevolutionService {
    private repo: DevolutionRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<DevolutionRepository>('DevolutionRepository')
    }

    /**
     * Obtiene todos los devolutions
     */
    async getAll(): Promise<Types.DevolutionSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene devolution por ID
     * @throws DevolutionNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Devolution> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.DevolutionNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo devolution
     */
    async create(data: Partial<Types.Devolution>): Promise<Types.Devolution> {
        this.log.trace('Creando devolution')
        return this.repo.create(data)
    }

    /**
     * Actualiza devolution
     * @throws DevolutionNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Devolution>): Promise<Types.Devolution> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.DevolutionNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina devolution
     * @throws DevolutionNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.DevolutionNotFoundError(id)
        }
        this.log.info('Eliminado devolution ' + id)
    }
}
