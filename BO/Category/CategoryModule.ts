import { IContainer } from '@toproc/types'
import { CategoryService } from './CategoryService.js'
import { CategoryRepository } from './CategoryRepository.js'

export function registerCategory(container: IContainer) {
    if (!container.has('CategoryRepository')) {
        container.registerFactory('CategoryRepository', (c) => new CategoryRepository(c.resolve('db')))
    }
    if (!container.has('CategoryService')) {
        container.registerFactory('CategoryService', (c) => new CategoryService(c))
    }
}

export { CategoryService } from './CategoryService.js'
export { CategoryRepository } from './CategoryRepository.js'
export { CategoryMessages } from './CategoryMessages.js'
export { CategorySchemas, createCategorySchemas } from './CategorySchemas.js'
export { CategoryQueries } from './CategoryQueries.js'
export type * as Inputs from './CategorySchemas.js'
export type * as Types from './CategoryTypes.js'
export * as Errors from './CategoryErrors.js'
export * as Queries from './CategoryQueries.js'
