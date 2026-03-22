import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { UserRepository, Errors, Types } from './UserModule.js'

/**
 * Capa de servicio para lógica de negocio de User.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./UserErrors.js
 */
export class UserService extends BOService implements Types.IUserService {
    private repo: UserRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<UserRepository>('UserRepository')
    }

    /**
     * Obtiene todos los users
     */
    async getAll(): Promise<Types.UserSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene user por ID
     * @throws UserNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.User> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.UserNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo user
     */
    async create(data: Partial<Types.User>): Promise<Types.User> {
        this.log.trace('Creando user')
        return this.repo.create(data)
    }

    /**
     * Actualiza user
     * @throws UserNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.User>): Promise<Types.User> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.UserNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina user
     * @throws UserNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.UserNotFoundError(id)
        }
        this.log.info('Eliminado user ' + id)
    }
}
