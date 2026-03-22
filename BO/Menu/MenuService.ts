import { BOService } from '@toproc/bo'
import { IContainer, IMenuProvider } from '@toproc/types'
import { MenuRepository, Errors, Types } from './MenuModule.js'

/**
 * Capa de servicio para lógica de negocio de Menu.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./MenuErrors.js
 */
export class MenuService extends BOService implements Types.IMenuService {
    private repo: MenuRepository
    private menuProvider: IMenuProvider

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<MenuRepository>('MenuRepository')
        this.menuProvider = container.resolve<IMenuProvider>('MenuProvider')
    }

    /**
     * Obtiene todos los menus
     */
    async getAll(): Promise<Types.MenuSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene menu por ID
     * @throws MenuNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Menu> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.MenuNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo menu
     */
    async create(data: Partial<Types.Menu>): Promise<Types.Menu> {
        this.log.trace('Creando menu')
        return this.repo.create(data)
    }

    /**
     * Actualiza menu
     * @throws MenuNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Menu>): Promise<Types.Menu> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.MenuNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina menu
     * @throws MenuNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.MenuNotFoundError(id)
        }
        this.log.info('Eliminado menu ' + id)
    }
}
