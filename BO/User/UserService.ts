import bcrypt from 'bcryptjs'
import { BOService } from '@toproc/bo'
import type { IContainer, ISecurityService } from '@toproc/types'
import { UserRepository, Errors, Types } from './UserModule.js'

function withoutPassword<T extends object>(user: T): Omit<T, 'user_pw'> {
    const { user_pw: _, ...rest } = user as T & { user_pw?: string }
    return rest
}

async function hashPassword<T extends { user_pw?: string }>(data: T): Promise<T> {
    return data.user_pw ? { ...data, user_pw: await bcrypt.hash(data.user_pw, 10) } : data
}

/**
 * Capa de servicio para lógica de negocio de User.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./UserErrors.js
 */
export class UserService extends BOService implements Types.IUserService {
    private repo: UserRepository
    private security: ISecurityService

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<UserRepository>('UserRepository')
        this.security = container.resolve<ISecurityService>('security')
    }

    /**
     * Obtiene todos los users
     */
    async getAll(filters?: Types.GetAllUserInput): Promise<Types.UserSummary[]> {
        return (await this.repo.findAll(filters)).map(withoutPassword)
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
        return withoutPassword(entity)
    }

    /**
     * Crea nuevo user
     */
    async create(data: Partial<Types.User>): Promise<Types.User> {
        this.log.trace('Creando user')
        return withoutPassword(await this.repo.create(await hashPassword(data)))
    }

    /**
     * Actualiza user
     * @throws UserNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.User>): Promise<Types.User> {
        const updated = await this.repo.update(id, await hashPassword(data))
        if (!updated) {
            throw new Errors.UserNotFoundError(id)
        }
        return withoutPassword(updated)
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

    async assignProfile(data: Types.User.ProfileAssignmentInput): Promise<boolean> {
        return this.security.assignProfileToUser(data.user_id, data.profile_id)
    }

    async revokeProfile(data: Types.User.ProfileAssignmentInput): Promise<boolean> {
        return this.security.revokeProfileFromUser(data.user_id, data.profile_id)
    }
}
