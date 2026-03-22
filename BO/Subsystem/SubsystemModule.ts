import { IContainer } from '@toproc/types'
import { SubsystemService } from './SubsystemService.js'
import { SubsystemRepository } from './SubsystemRepository.js'

export function registerSubsystem(container: IContainer) {
    if (!container.has('SubsystemRepository')) {
        container.registerFactory('SubsystemRepository', (c) => new SubsystemRepository(c.resolve('db')))
    }
    if (!container.has('SubsystemService')) {
        container.registerFactory('SubsystemService', (c) => new SubsystemService(c))
    }
}

export { SubsystemService } from './SubsystemService.js'
export { SubsystemRepository } from './SubsystemRepository.js'
export { SubsystemMessages } from './SubsystemMessages.js'
export { SubsystemSchemas, createSubsystemSchemas } from './SubsystemSchemas.js'
export { SubsystemQueries } from './SubsystemQueries.js'
export type * as Inputs from './SubsystemSchemas.js'
export type * as Types from './SubsystemTypes.js'
export * as Errors from './SubsystemErrors.js'
export * as Queries from './SubsystemQueries.js'
