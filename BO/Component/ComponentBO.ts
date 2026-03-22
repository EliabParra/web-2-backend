import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { ComponentService, ComponentMessages, ComponentSchemas, Inputs, Types, registerComponent } from './ComponentModule.js'

/**
 * Business Object para el dominio Component.
 *
 * Orquesta transacciones de Component y expone endpoints de API.
 */
export class ComponentBO extends BaseBO {
    private service: ComponentService

    constructor(container: IContainer) {
        super(container)
        registerComponent(container)
        this.service = container.resolve<ComponentService>('ComponentService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get componentMessages() {
        return this.i18n.use(ComponentMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Component>(
            params,
            ComponentSchemas.get,
            async (data) => {
                const result: Types.Component = await this.service.getById(data.item_id)
                return this.success(result, this.componentMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.ComponentSummary>>(
            params,
            ComponentSchemas.getAll,
            async () => {
                const result: Array<Types.ComponentSummary> = await this.service.getAll()
                return this.success(result, this.componentMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Component>(
            params,
            ComponentSchemas.create,
            async (data) => {
                const result: Types.Component = await this.service.create(data)
                return this.created(result, this.componentMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Component>(
            params,
            ComponentSchemas.update,
            async (data) => {
                const result: Types.Component = await this.service.update(data.item_id, data)
                return this.success(result, this.componentMessages.update)
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
            ComponentSchemas.delete,
            async (data) => {
                await this.service.delete(data.item_id)
                return this.success(null, this.componentMessages.delete)
            }
        )
    }
}
