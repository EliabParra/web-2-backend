import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { OptionService, OptionMessages, OptionSchemas, Inputs, Types, registerOption } from './OptionModule.js'

/**
 * Business Object para el dominio Option.
 *
 * Orquesta transacciones de Option y expone endpoints de API.
 */
export class OptionBO extends BaseBO {
    private service: OptionService

    constructor(container: IContainer) {
        super(container)
        registerOption(container)
        this.service = container.resolve<OptionService>('OptionService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get optionMessages() {
        return this.i18n.use(OptionMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Option>(
            params,
            OptionSchemas.get,
            async (data) => {
                const result: Types.Option = await this.service.getById(data.id)
                return this.success(result, this.optionMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.OptionSummary>>(
            params,
            OptionSchemas.getAll,
            async () => {
                const result: Array<Types.OptionSummary> = await this.service.getAll()
                return this.success(result, this.optionMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Option>(
            params,
            OptionSchemas.create,
            async (data) => {
                const result: Types.Option = await this.service.create(data)
                return this.created(result, this.optionMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Option>(
            params,
            OptionSchemas.update,
            async (data) => {
                const result: Types.Option = await this.service.update(data.id, data)
                return this.success(result, this.optionMessages.update)
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
            OptionSchemas.delete,
            async (data) => {
                await this.service.delete(data.id)
                return this.success(null, this.optionMessages.delete)
            }
        )
    }
}
