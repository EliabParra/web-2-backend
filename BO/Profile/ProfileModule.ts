import { IContainer } from '@toproc/types'
import { ProfileService } from './ProfileService.js'
import { ProfileRepository } from './ProfileRepository.js'

export function registerProfile(container: IContainer) {
    if (!container.has('ProfileRepository')) {
        container.registerFactory('ProfileRepository', (c) => new ProfileRepository(c.resolve('db')))
    }
    if (!container.has('ProfileService')) {
        container.registerFactory('ProfileService', (c) => new ProfileService(c))
    }
}

export { ProfileService } from './ProfileService.js'
export { ProfileRepository } from './ProfileRepository.js'
export { ProfileMessages } from './ProfileMessages.js'
export { ProfileSchemas, createProfileSchemas } from './ProfileSchemas.js'
export { ProfileQueries } from './ProfileQueries.js'
export type * as Inputs from './ProfileSchemas.js'
export type * as Types from './ProfileTypes.js'
export * as Errors from './ProfileErrors.js'
export * as Queries from './ProfileQueries.js'
