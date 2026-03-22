import { IContainer } from '@toproc/types'
import { DevolutionService } from './DevolutionService.js'
import { DevolutionRepository } from './DevolutionRepository.js'

export function registerDevolution(container: IContainer) {
    if (!container.has('DevolutionRepository')) {
        container.registerFactory('DevolutionRepository', (c) => new DevolutionRepository(c.resolve('db')))
    }
    if (!container.has('DevolutionService')) {
        container.registerFactory('DevolutionService', (c) => new DevolutionService(c))
    }
}

export { DevolutionService } from './DevolutionService.js'
export { DevolutionRepository } from './DevolutionRepository.js'
export { DevolutionMessages } from './DevolutionMessages.js'
export { DevolutionSchemas, createDevolutionSchemas } from './DevolutionSchemas.js'
export { DevolutionQueries } from './DevolutionQueries.js'
export type * as Inputs from './DevolutionSchemas.js'
export type * as Types from './DevolutionTypes.js'
export * as Errors from './DevolutionErrors.js'
export * as Queries from './DevolutionQueries.js'
