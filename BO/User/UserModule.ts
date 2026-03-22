import { IContainer } from '@toproc/types'
import { UserService } from './UserService.js'
import { UserRepository } from './UserRepository.js'

export function registerUser(container: IContainer) {
    if (!container.has('UserRepository')) {
        container.registerFactory('UserRepository', (c) => new UserRepository(c.resolve('db')))
    }
    if (!container.has('UserService')) {
        container.registerFactory('UserService', (c) => new UserService(c))
    }
}

export { UserService } from './UserService.js'
export { UserRepository } from './UserRepository.js'
export { UserMessages } from './UserMessages.js'
export { UserSchemas, createUserSchemas } from './UserSchemas.js'
export { UserQueries } from './UserQueries.js'
export type * as Inputs from './UserSchemas.js'
export type * as Types from './UserTypes.js'
export * as Errors from './UserErrors.js'
export * as Queries from './UserQueries.js'
