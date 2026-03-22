import { IContainer } from '@toproc/types'
import { GroupService } from './GroupService.js'
import { GroupRepository } from './GroupRepository.js'

export function registerGroup(container: IContainer) {
    if (!container.has('GroupRepository')) {
        container.registerFactory('GroupRepository', (c) => new GroupRepository(c.resolve('db')))
    }
    if (!container.has('GroupService')) {
        container.registerFactory('GroupService', (c) => new GroupService(c))
    }
}

export { GroupService } from './GroupService.js'
export { GroupRepository } from './GroupRepository.js'
export { GroupMessages } from './GroupMessages.js'
export { GroupSchemas, createGroupSchemas } from './GroupSchemas.js'
export { GroupQueries } from './GroupQueries.js'
export type * as Inputs from './GroupSchemas.js'
export type * as Types from './GroupTypes.js'
export * as Errors from './GroupErrors.js'
export * as Queries from './GroupQueries.js'
