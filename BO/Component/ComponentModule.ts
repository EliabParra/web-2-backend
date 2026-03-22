import { IContainer } from '@toproc/types'
import { ComponentService } from './ComponentService.js'
import { ComponentRepository } from './ComponentRepository.js'

export function registerComponent(container: IContainer) {
    if (!container.has('ComponentRepository')) {
        container.registerFactory('ComponentRepository', (c) => new ComponentRepository(c.resolve('db')))
    }
    if (!container.has('ComponentService')) {
        container.registerFactory('ComponentService', (c) => new ComponentService(c))
    }
}

export { ComponentService } from './ComponentService.js'
export { ComponentRepository } from './ComponentRepository.js'
export { ComponentMessages } from './ComponentMessages.js'
export { ComponentSchemas, createComponentSchemas } from './ComponentSchemas.js'
export { ComponentQueries } from './ComponentQueries.js'
export type * as Inputs from './ComponentSchemas.js'
export type * as Types from './ComponentTypes.js'
export * as Errors from './ComponentErrors.js'
export * as Queries from './ComponentQueries.js'
