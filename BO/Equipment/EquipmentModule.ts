import { IContainer } from '@toproc/types'
import { EquipmentService } from './EquipmentService.js'
import { EquipmentRepository } from './EquipmentRepository.js'

export function registerEquipment(container: IContainer) {
    if (!container.has('EquipmentRepository')) {
        container.registerFactory('EquipmentRepository', (c) => new EquipmentRepository(c.resolve('db')))
    }
    if (!container.has('EquipmentService')) {
        container.registerFactory('EquipmentService', (c) => new EquipmentService(c))
    }
}

export { EquipmentService } from './EquipmentService.js'
export { EquipmentRepository } from './EquipmentRepository.js'
export { EquipmentMessages } from './EquipmentMessages.js'
export { EquipmentSchemas, createEquipmentSchemas } from './EquipmentSchemas.js'
export { EquipmentQueries } from './EquipmentQueries.js'
export type * as Inputs from './EquipmentSchemas.js'
export type * as Types from './EquipmentTypes.js'
export * as Errors from './EquipmentErrors.js'
export * as Queries from './EquipmentQueries.js'
