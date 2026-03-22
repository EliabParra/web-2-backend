import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { MethodRepository, Errors, Types } from './MethodModule.js'

/**
 * Capa de servicio para lógica de negocio de Method.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./MethodErrors.js
 */
export class MethodService extends BOService implements Types.IMethodService {
    private repo: MethodRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<MethodRepository>('MethodRepository')
    }

    /**
     * Obtiene todos los methods
     */
    async getAll(): Promise<Types.MethodSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene method por ID
     * @throws MethodNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Method> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.MethodNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo method
     */
    async create(data: Partial<Types.Method>): Promise<Types.Method> {
        this.log.info('Creando method')
        return this.repo.create(data)
    }

    /**
     * Actualiza method
     * @throws MethodNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Method>): Promise<Types.Method> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.MethodNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina method
     * @throws MethodNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.MethodNotFoundError(id)
        }
        this.log.info('Eliminado method ' + id)
    }
}
