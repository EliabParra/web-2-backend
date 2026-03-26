import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { DevolutionService, DevolutionMessages, DevolutionSchemas, Inputs, Types, registerDevolution } from './DevolutionModule.js'

/**
 * Business Object para el dominio Devolution.
 *
 * Orquesta transacciones de Devolution y expone endpoints de API.
 */
export class DevolutionBO extends BaseBO {
    private service: DevolutionService

    constructor(container: IContainer) {
        super(container)
        registerDevolution(container)
        this.service = container.resolve<DevolutionService>('DevolutionService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get devolutionMessages() {
        return this.i18n.use(DevolutionMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Devolution>(
            params,
            DevolutionSchemas.get,
            async (data) => {
                const result: Types.Devolution = await this.service.getById(data.id)
                return this.success(result, this.devolutionMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.DevolutionSummary>>(
            params,
            DevolutionSchemas.getAll,
            async (data) => {
                const result: Array<Types.DevolutionSummary> = await this.service.getAll(data)
                return this.success(result, this.devolutionMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Devolution>(
            params,
            DevolutionSchemas.create,
            async (data) => {
                const result: Types.Devolution = await this.service.create(data)
                return this.created(result, this.devolutionMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Devolution>(
            params,
            DevolutionSchemas.update,
            async (data) => {
                const result: Types.Devolution = await this.service.update(data.id, data)
                return this.success(result, this.devolutionMessages.update)
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
            DevolutionSchemas.delete,
            async (data) => {
                await this.service.delete(data.id)
                return this.success(null, this.devolutionMessages.delete)
            }
        )
    }

    async registerDevolution(params: Inputs.RegisterDevolutionInput): Promise<ApiResponse> {
        return this.exec<Inputs.RegisterDevolutionInput, Types.Devolution>(
            params,
            DevolutionSchemas.registerDevolution,
            async (data) => {
                const result = await this.service.registerDevolution(data)
                return this.created(result, this.devolutionMessages.create)
            }
        )
    }

    async getAllDevolutions(params: Inputs.GetAllDevolutionsInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetAllDevolutionsInput, Array<Types.DevolutionSummary>>(
            params,
            DevolutionSchemas.getAllDevolutions,
            async (data) => {
                const result = await this.service.getAllDevolutions(data)
                return this.success(result, this.devolutionMessages.getAll)
            }
        )
    }

    async getUserDevolution(params: Inputs.GetUserDevolutionInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetUserDevolutionInput, Array<Types.DevolutionSummary>>(
            params,
            DevolutionSchemas.getUserDevolution,
            async (data) => {
                const result = await this.service.getUserDevolution(data)
                return this.success(result, this.devolutionMessages.getAll)
            }
        )
    }

    async getDevolution(params: Inputs.GetDevolutionInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetDevolutionInput, Types.Devolution>(
            params,
            DevolutionSchemas.getDevolution,
            async (data) => {
                const result = await this.service.getDevolution(data)
                return this.success(result, this.devolutionMessages.get)
            }
        )
    }
}
