import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { PropertyRepository, Errors, Types } from './PropertyModule.js'

/**
 * Capa de servicio para lógica de negocio de Property.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./PropertyErrors.js
 */
export class PropertyService extends BOService implements Types.IPropertyService {
    private repo: PropertyRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<PropertyRepository>('PropertyRepository')
    }

    /**
     * Obtiene todos los propertys
     */
    async getAll(): Promise<Types.PropertySummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene property por ID
     * @throws PropertyNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Property> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.PropertyNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo property
     */
    async create(data: Partial<Types.Property>): Promise<Types.Property> {
        this.log.trace('Creando property')
        return this.repo.create(data)
    }

    /**
     * Actualiza property
     * @throws PropertyNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Property>): Promise<Types.Property> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.PropertyNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina property
     * @throws PropertyNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.PropertyNotFoundError(id)
        }
        this.log.info('Eliminado property ' + id)
    }
}
