export { AuthService } from './AuthService.js'
export { AuthRepository } from './AuthRepository.js'
export { AuthMessages } from './AuthMessages.js'
export { AuthSchemas } from './AuthSchemas.js'
export { AuthQueries } from './AuthQueries.js'
export type * as Inputs from './AuthSchemas.js'
export type * as Types from './AuthTypes.js'
export * as Errors from './AuthErrors.js'
export * as Queries from './AuthQueries.js'

import { IContainer } from '../../src/types/core.js'
import { AuthService } from './AuthService.js'
import { AuthRepository } from './AuthRepository.js'

export function registerAuth(container: IContainer) {
    if (!container.has('AuthRepository')) {
        container.registerFactory('AuthRepository', (c) => new AuthRepository(c.resolve('db')))
    }
    if (!container.has('AuthService')) {
        container.registerFactory('AuthService', (c) => new AuthService(c))
    }
}
