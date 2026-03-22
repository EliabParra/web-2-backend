import { IContainer } from '@toproc/types'
import { LoanService } from './LoanService.js'
import { LoanRepository } from './LoanRepository.js'

export function registerLoan(container: IContainer) {
    if (!container.has('LoanRepository')) {
        container.registerFactory('LoanRepository', (c) => new LoanRepository(c.resolve('db')))
    }
    if (!container.has('LoanService')) {
        container.registerFactory('LoanService', (c) => new LoanService(c))
    }
}

export { LoanService } from './LoanService.js'
export { LoanRepository } from './LoanRepository.js'
export { LoanMessages } from './LoanMessages.js'
export { LoanSchemas, createLoanSchemas } from './LoanSchemas.js'
export { LoanQueries } from './LoanQueries.js'
export type * as Inputs from './LoanSchemas.js'
export type * as Types from './LoanTypes.js'
export * as Errors from './LoanErrors.js'
export * as Queries from './LoanQueries.js'
