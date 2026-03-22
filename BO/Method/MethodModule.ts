import { IContainer } from '@toproc/types'
import { MethodService } from './MethodService.js'
import { MethodRepository } from './MethodRepository.js'

export function registerMethod(container: IContainer) {
    if (!container.has('MethodRepository')) {
        container.registerFactory('MethodRepository', (c) => new MethodRepository(c.resolve('db')))
    }
    if (!container.has('MethodService')) {
        container.registerFactory('MethodService', (c) => new MethodService(c))
    }
}

export { MethodService } from './MethodService.js'
export { MethodRepository } from './MethodRepository.js'
export { MethodMessages } from './MethodMessages.js'
export { MethodSchemas, createMethodSchemas } from './MethodSchemas.js'
export { MethodQueries } from './MethodQueries.js'
export type * as Inputs from './MethodSchemas.js'
export type * as Types from './MethodTypes.js'
export * as Errors from './MethodErrors.js'
export * as Queries from './MethodQueries.js'
