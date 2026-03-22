import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { NotificationService, NotificationMessages, NotificationSchemas, Inputs, Types, registerNotification } from './NotificationModule.js'

/**
 * Business Object para el dominio Notification.
 *
 * Orquesta transacciones de Notification y expone endpoints de API.
 */
export class NotificationBO extends BaseBO {
    private service: NotificationService

    constructor(container: IContainer) {
        super(container)
        registerNotification(container)
        this.service = container.resolve<NotificationService>('NotificationService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get notificationMessages() {
        return this.i18n.use(NotificationMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Notification>(
            params,
            NotificationSchemas.get,
            async (data) => {
                const result: Types.Notification = await this.service.getById(data.id)
                return this.success(result, this.notificationMessages.get)
            }
        )
    }

    /**
     * Operación GetAll
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async getAll(params: Inputs.GetAllInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetAllInput, Array<Types.NotificationSummary>>(
            params,
            NotificationSchemas.getAll,
            async () => {
                const result: Array<Types.NotificationSummary> = await this.service.getAll()
                return this.success(result, this.notificationMessages.getAll)
            }
        )
    }

    /**
     * Operación Create
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async create(params: Inputs.CreateInput): Promise<ApiResponse> {
        return this.exec<Inputs.CreateInput, Types.Notification>(
            params,
            NotificationSchemas.create,
            async (data) => {
                const result: Types.Notification = await this.service.create(data)
                return this.created(result, this.notificationMessages.create)
            }
        )
    }

    /**
     * Operación Update
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async update(params: Inputs.UpdateInput): Promise<ApiResponse> {
        return this.exec<Inputs.UpdateInput, Types.Notification>(
            params,
            NotificationSchemas.update,
            async (data) => {
                const result: Types.Notification = await this.service.update(data.id, data)
                return this.success(result, this.notificationMessages.update)
            }
        )
    }

    /**
     * Operación Delete
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async delete(params: Inputs.DeleteInput): Promise<ApiResponse> {
        return this.exec<Inputs.DeleteInput, void>(
            params,
            NotificationSchemas.delete,
            async (data) => {
                await this.service.delete(data.id)
                return this.success(null, this.notificationMessages.delete)
            }
        )
    }
}
