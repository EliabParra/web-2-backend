import { IContainer } from '@toproc/types'
import { OptionService } from './OptionService.js'
import { OptionRepository } from './OptionRepository.js'

export function registerOption(container: IContainer) {
    if (!container.has('OptionRepository')) {
        container.registerFactory('OptionRepository', (c) => new OptionRepository(c.resolve('db')))
    }
    if (!container.has('OptionService')) {
        container.registerFactory('OptionService', (c) => new OptionService(c))
    }
}

export { OptionService } from './OptionService.js'
export { OptionRepository } from './OptionRepository.js'
export { OptionMessages } from './OptionMessages.js'
export { OptionSchemas, createOptionSchemas } from './OptionSchemas.js'
export { OptionQueries } from './OptionQueries.js'
export type * as Inputs from './OptionSchemas.js'
export type * as Types from './OptionTypes.js'
export * as Errors from './OptionErrors.js'
export * as Queries from './OptionQueries.js'
