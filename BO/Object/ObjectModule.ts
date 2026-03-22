import { IContainer } from '@toproc/types'
import { ObjectService } from './ObjectService.js'
import { ObjectRepository } from './ObjectRepository.js'

export function registerObject(container: IContainer) {
    if (!container.has('ObjectRepository')) {
        container.registerFactory('ObjectRepository', (c) => new ObjectRepository(c.resolve('db')))
    }
    if (!container.has('ObjectService')) {
        container.registerFactory('ObjectService', (c) => new ObjectService(c))
    }
}

export { ObjectService } from './ObjectService.js'
export { ObjectRepository } from './ObjectRepository.js'
export { ObjectMessages } from './ObjectMessages.js'
export { ObjectSchemas, createObjectSchemas } from './ObjectSchemas.js'
export { ObjectQueries } from './ObjectQueries.js'
export type * as Inputs from './ObjectSchemas.js'
export type * as Types from './ObjectTypes.js'
export * as Errors from './ObjectErrors.js'
export * as Queries from './ObjectQueries.js'
