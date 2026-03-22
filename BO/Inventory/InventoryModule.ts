import { IContainer } from '@toproc/types'
import { InventoryService } from './InventoryService.js'
import { InventoryRepository } from './InventoryRepository.js'

export function registerInventory(container: IContainer) {
    if (!container.has('InventoryRepository')) {
        container.registerFactory('InventoryRepository', (c) => new InventoryRepository(c.resolve('db')))
    }
    if (!container.has('InventoryService')) {
        container.registerFactory('InventoryService', (c) => new InventoryService(c))
    }
}

export { InventoryService } from './InventoryService.js'
export { InventoryRepository } from './InventoryRepository.js'
export { InventoryMessages } from './InventoryMessages.js'
export { InventorySchemas, createInventorySchemas } from './InventorySchemas.js'
export { InventoryQueries } from './InventoryQueries.js'
export type * as Inputs from './InventorySchemas.js'
export type * as Types from './InventoryTypes.js'
export * as Errors from './InventoryErrors.js'
export * as Queries from './InventoryQueries.js'
