import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { MethodService, MethodMessages, MethodSchemas, Inputs, Types, registerMethod } from './MethodModule.js'

/**
 * Business Object para el dominio Method.
 *
 * Orquesta transacciones de Method y expone endpoints de API.
 */
export class MethodBO extends BaseBO {
    private service: MethodService

    constructor(container: IContainer) {
        super(container)
        registerMethod(container)
        this.service = container.resolve<MethodService>('MethodService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get methodMessages() {
        return this.i18n.use(MethodMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Method>(
            params,
            MethodSchemas.get,
            async (data) => {
                const result: Types.Method = await this.service.getById(data.id)
                return this.success(result, this.methodMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.MethodSummary>>(
            params,
            MethodSchemas.getAll,
            async () => {
                const result: Array<Types.MethodSummary> = await this.service.getAll()
                return this.success(result, this.methodMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Method>(
            params,
            MethodSchemas.create,
            async (data) => {
                const result: Types.Method = await this.service.create(data)
                return this.created(result, this.methodMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Method>(
            params,
            MethodSchemas.update,
            async (data) => {
                const result: Types.Method = await this.service.update(data.id, data)
                return this.success(result, this.methodMessages.update)
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
            MethodSchemas.delete,
            async (data) => {
                await this.service.delete(data.id)
                return this.success(null, this.methodMessages.delete)
            }
        )
    }
}
