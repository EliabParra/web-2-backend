import { BOService, IContainer, IConfig, IDatabase } from '../../src/core/business-objects/index.js'
import type { ILogger } from '../../src/types/core.js'
import { ComponentRepository, Errors, Types } from './ComponentModule.js'

/**
 * Capa de servicio para lógica de negocio de Component.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./ComponentErrors.js
 */
export class ComponentService extends BOService implements Types.IComponentService {
    private repo: ComponentRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<ComponentRepository>('ComponentRepository')
    }

    /**
     * Obtiene todos los components
     */
    async getAll(): Promise<Types.ComponentSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene component por ID
     * @throws ComponentNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Component> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.ComponentNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo component
     */
    async create(data: Partial<Types.Component>): Promise<Types.Component> {
        this.log.info('Creando component')
        return this.repo.create(data)
    }

    /**
     * Actualiza component
     * @throws ComponentNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Component>): Promise<Types.Component> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.ComponentNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina component
     * @throws ComponentNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.ComponentNotFoundError(id)
        }
        this.log.info('Eliminado component ' + id)
    }
}
