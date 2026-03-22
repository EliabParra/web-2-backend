import { IContainer } from '@toproc/types'
import { ReportService } from './ReportService.js'
import { ReportRepository } from './ReportRepository.js'

export function registerReport(container: IContainer) {
    if (!container.has('ReportRepository')) {
        container.registerFactory('ReportRepository', (c) => new ReportRepository(c.resolve('db')))
    }
    if (!container.has('ReportService')) {
        container.registerFactory('ReportService', (c) => new ReportService(c))
    }
}

export { ReportService } from './ReportService.js'
export { ReportRepository } from './ReportRepository.js'
export { ReportMessages } from './ReportMessages.js'
export { ReportSchemas, createReportSchemas } from './ReportSchemas.js'
export { ReportQueries } from './ReportQueries.js'
export type * as Inputs from './ReportSchemas.js'
export type * as Types from './ReportTypes.js'
export * as Errors from './ReportErrors.js'
export * as Queries from './ReportQueries.js'
