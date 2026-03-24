import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { CategoryRepository, Errors, Types } from './CategoryModule.js'

/**
 * Capa de servicio para lógica de negocio de Category.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./CategoryErrors.js
 */
export class CategoryService extends BOService implements Types.ICategoryService {
    private repo: CategoryRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<CategoryRepository>('CategoryRepository')
    }

    /**
     * Obtiene todos los categorys
     */
    async getAll(filters?: Types.GetAllCategoryInput): Promise<Types.CategorySummary[]> {
        return this.repo.findAll(filters)
    }

    /**
     * Obtiene category por ID
     * @throws CategoryNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Category> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.CategoryNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo category
     */
    async create(data: Partial<Types.Category>): Promise<Types.Category> {
        this.log.trace('Creando category')
        return this.repo.create(data)
    }

    /**
     * Actualiza category
     * @throws CategoryNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Category>): Promise<Types.Category> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.CategoryNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina category
     * @throws CategoryNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.CategoryNotFoundError(id)
        }
        this.log.info('Eliminado category ' + id)
    }
}
