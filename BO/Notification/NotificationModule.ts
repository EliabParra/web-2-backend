import { IContainer } from '../../src/types/index.js'
import { NotificationService } from './NotificationService.js'
import { NotificationRepository } from './NotificationRepository.js'

export function registerNotification(container: IContainer) {
    if (!container.has('NotificationRepository')) {
        container.registerFactory(
            'NotificationRepository',
            (c) => new NotificationRepository(c.resolve('db'))
        )
    }
    if (!container.has('NotificationService')) {
        container.registerFactory('NotificationService', (c) => new NotificationService(c))
    }
}

export { NotificationService } from './NotificationService.js'
export { NotificationRepository } from './NotificationRepository.js'
export { NotificationMessages } from './NotificationMessages.js'
export { NotificationSchemas, createNotificationSchemas } from './NotificationSchemas.js'
export { NotificationEvents } from './NotificationEvents.js'
export { NotificationQueries } from './NotificationQueries.js'
export type * as Inputs from './NotificationSchemas.js'
export type * as Types from './NotificationTypes.js'
export * as Errors from './NotificationErrors.js'
export * as Queries from './NotificationQueries.js'
