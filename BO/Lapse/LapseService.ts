import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { LapseRepository, Errors, Types } from './LapseModule.js'

/**
 * Capa de servicio para lógica de negocio de Lapse.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./LapseErrors.js
 */
export class LapseService extends BOService implements Types.ILapseService {
    private repo: LapseRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<LapseRepository>('LapseRepository')
    }

    /**
     * Obtiene todos los lapses
     */
    async getAll(): Promise<Types.LapseSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene lapse por ID
     * @throws LapseNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Lapse> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.LapseNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo lapse
     */
    async create(data: Partial<Types.Lapse>): Promise<Types.Lapse> {
        this.log.trace('Creando lapse')
        return this.repo.create(data)
    }

    /**
     * Actualiza lapse
     * @throws LapseNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Lapse>): Promise<Types.Lapse> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.LapseNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina lapse
     * @throws LapseNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.LapseNotFoundError(id)
        }
        this.log.info('Eliminado lapse ' + id)
    }
}
