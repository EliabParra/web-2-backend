import { IContainer } from '../../src/types/index.js'
import { LocationService } from './LocationService.js'
import { LocationRepository } from './LocationRepository.js'

export function registerLocation(container: IContainer) {
    if (!container.has('LocationRepository')) {
        container.registerFactory('LocationRepository', (c) => new LocationRepository(c.resolve('db')))
    }
    if (!container.has('LocationService')) {
        container.registerFactory('LocationService', (c) => new LocationService(c))
    }
}

export { LocationService } from './LocationService.js'
export { LocationRepository } from './LocationRepository.js'
export { LocationMessages } from './LocationMessages.js'
export { LocationSchemas, createLocationSchemas } from './LocationSchemas.js'
export { LocationQueries } from './LocationQueries.js'
export type * as Inputs from './LocationSchemas.js'
export type * as Types from './LocationTypes.js'
export * as Errors from './LocationErrors.js'
export * as Queries from './LocationQueries.js'
