import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { SubsystemRepository, Errors, Types } from './SubsystemModule.js'

/**
 * Capa de servicio para lógica de negocio de Subsystem.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./SubsystemErrors.js
 */
export class SubsystemService extends BOService implements Types.ISubsystemService {
    private repo: SubsystemRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<SubsystemRepository>('SubsystemRepository')
    }

    /**
     * Obtiene todos los subsystems
     */
    async getAll(): Promise<Types.SubsystemSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene subsystem por ID
     * @throws SubsystemNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Subsystem> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.SubsystemNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo subsystem
     */
    async create(data: Partial<Types.Subsystem>): Promise<Types.Subsystem> {
        this.log.trace('Creando subsystem')
        return this.repo.create(data)
    }

    /**
     * Actualiza subsystem
     * @throws SubsystemNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Subsystem>): Promise<Types.Subsystem> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.SubsystemNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina subsystem
     * @throws SubsystemNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.SubsystemNotFoundError(id)
        }
        this.log.info('Eliminado subsystem ' + id)
    }
}
