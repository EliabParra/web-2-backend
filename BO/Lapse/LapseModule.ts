import { IContainer } from '@toproc/types'
import { LapseService } from './LapseService.js'
import { LapseRepository } from './LapseRepository.js'

export function registerLapse(container: IContainer) {
    if (!container.has('LapseRepository')) {
        container.registerFactory('LapseRepository', (c) => new LapseRepository(c.resolve('db')))
    }
    if (!container.has('LapseService')) {
        container.registerFactory('LapseService', (c) => new LapseService(c))
    }
}

export { LapseService } from './LapseService.js'
export { LapseRepository } from './LapseRepository.js'
export { LapseMessages } from './LapseMessages.js'
export { LapseSchemas, createLapseSchemas } from './LapseSchemas.js'
export { LapseQueries } from './LapseQueries.js'
export type * as Inputs from './LapseSchemas.js'
export type * as Types from './LapseTypes.js'
export * as Errors from './LapseErrors.js'
export * as Queries from './LapseQueries.js'
