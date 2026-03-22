import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { LapseService, LapseMessages, LapseSchemas, Inputs, Types, registerLapse } from './LapseModule.js'

/**
 * Business Object para el dominio Lapse.
 *
 * Orquesta transacciones de Lapse y expone endpoints de API.
 */
export class LapseBO extends BaseBO {
    private service: LapseService

    constructor(container: IContainer) {
        super(container)
        registerLapse(container)
        this.service = container.resolve<LapseService>('LapseService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get lapseMessages() {
        return this.i18n.use(LapseMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Lapse>(
            params,
            LapseSchemas.get,
            async (data) => {
                const result: Types.Lapse = await this.service.getById(data.lapse_id)
                return this.success(result, this.lapseMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.LapseSummary>>(
            params,
            LapseSchemas.getAll,
            async () => {
                const result: Array<Types.LapseSummary> = await this.service.getAll()
                return this.success(result, this.lapseMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Lapse>(
            params,
            LapseSchemas.create,
            async (data) => {
                const result: Types.Lapse = await this.service.create(data)
                return this.created(result, this.lapseMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Lapse>(
            params,
            LapseSchemas.update,
            async (data) => {
                const result: Types.Lapse = await this.service.update(data.lapse_id, data)
                return this.success(result, this.lapseMessages.update)
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
            LapseSchemas.delete,
            async (data) => {
                await this.service.delete(data.lapse_id)
                return this.success(null, this.lapseMessages.delete)
            }
        )
    }
}
