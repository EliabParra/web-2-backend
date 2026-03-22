import { IContainer } from '@toproc/types'
import { MenuService } from './MenuService.js'
import { MenuRepository } from './MenuRepository.js'

export function registerMenu(container: IContainer) {
    if (!container.has('MenuRepository')) {
        container.registerFactory('MenuRepository', (c) => new MenuRepository(c.resolve('db')))
    }
    if (!container.has('MenuService')) {
        container.registerFactory('MenuService', (c) => new MenuService(c))
    }
}

export { MenuService } from './MenuService.js'
export { MenuRepository } from './MenuRepository.js'
export { MenuMessages } from './MenuMessages.js'
export { MenuSchemas, createMenuSchemas } from './MenuSchemas.js'
export { MenuQueries } from './MenuQueries.js'
export type * as Inputs from './MenuSchemas.js'
export type * as Types from './MenuTypes.js'
export * as Errors from './MenuErrors.js'
export * as Queries from './MenuQueries.js'
