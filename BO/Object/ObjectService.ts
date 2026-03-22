import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { ObjectRepository, Errors, Types } from './ObjectModule.js'

/**
 * Capa de servicio para lógica de negocio de Object.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./ObjectErrors.js
 */
export class ObjectService extends BOService implements Types.IObjectService {
    private repo: ObjectRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<ObjectRepository>('ObjectRepository')
    }

    /**
     * Obtiene todos los objects
     */
    async getAll(): Promise<Types.ObjectSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene object por ID
     * @throws ObjectNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Object> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.ObjectNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo object
     */
    async create(data: Partial<Types.Object>): Promise<Types.Object> {
        this.log.trace('Creando object')
        return this.repo.create(data)
    }

    /**
     * Actualiza object
     * @throws ObjectNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Object>): Promise<Types.Object> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.ObjectNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina object
     * @throws ObjectNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.ObjectNotFoundError(id)
        }
        this.log.info('Eliminado object ' + id)
    }
}
