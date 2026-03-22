import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { OptionRepository, Errors, Types } from './OptionModule.js'

/**
 * Capa de servicio para lógica de negocio de Option.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./OptionErrors.js
 */
export class OptionService extends BOService implements Types.IOptionService {
    private repo: OptionRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<OptionRepository>('OptionRepository')
    }

    /**
     * Obtiene todos los options
     */
    async getAll(): Promise<Types.OptionSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene option por ID
     * @throws OptionNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Option> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.OptionNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo option
     */
    async create(data: Partial<Types.Option>): Promise<Types.Option> {
        this.log.trace('Creando option')
        return this.repo.create(data)
    }

    /**
     * Actualiza option
     * @throws OptionNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Option>): Promise<Types.Option> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.OptionNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina option
     * @throws OptionNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.OptionNotFoundError(id)
        }
        this.log.info('Eliminado option ' + id)
    }
}
