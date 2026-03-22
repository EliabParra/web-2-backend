import { IContainer } from '@toproc/types'
import { PropertyService } from './PropertyService.js'
import { PropertyRepository } from './PropertyRepository.js'

export function registerProperty(container: IContainer) {
    if (!container.has('PropertyRepository')) {
        container.registerFactory('PropertyRepository', (c) => new PropertyRepository(c.resolve('db')))
    }
    if (!container.has('PropertyService')) {
        container.registerFactory('PropertyService', (c) => new PropertyService(c))
    }
}

export { PropertyService } from './PropertyService.js'
export { PropertyRepository } from './PropertyRepository.js'
export { PropertyMessages } from './PropertyMessages.js'
export { PropertySchemas, createPropertySchemas } from './PropertySchemas.js'
export { PropertyQueries } from './PropertyQueries.js'
export type * as Inputs from './PropertySchemas.js'
export type * as Types from './PropertyTypes.js'
export * as Errors from './PropertyErrors.js'
export * as Queries from './PropertyQueries.js'
