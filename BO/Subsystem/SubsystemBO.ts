import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { SubsystemService, SubsystemMessages, SubsystemSchemas, Inputs, Types, registerSubsystem } from './SubsystemModule.js'

/**
 * Business Object para el dominio Subsystem.
 *
 * Orquesta transacciones de Subsystem y expone endpoints de API.
 */
export class SubsystemBO extends BaseBO {
    private service: SubsystemService

    constructor(container: IContainer) {
        super(container)
        registerSubsystem(container)
        this.service = container.resolve<SubsystemService>('SubsystemService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get subsystemMessages() {
        return this.i18n.use(SubsystemMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Subsystem>(
            params,
            SubsystemSchemas.get,
            async (data) => {
                const result: Types.Subsystem = await this.service.getById(data.subsystem_id)
                return this.success(result, this.subsystemMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.SubsystemSummary>>(
            params,
            SubsystemSchemas.getAll,
            async () => {
                const result: Array<Types.SubsystemSummary> = await this.service.getAll()
                return this.success(result, this.subsystemMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Subsystem>(
            params,
            SubsystemSchemas.create,
            async (data) => {
                const result: Types.Subsystem = await this.service.create(data)
                return this.created(result, this.subsystemMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Subsystem>(
            params,
            SubsystemSchemas.update,
            async (data) => {
                const result: Types.Subsystem = await this.service.update(data.subsystem_id, data)
                return this.success(result, this.subsystemMessages.update)
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
            SubsystemSchemas.delete,
            async (data) => {
                await this.service.delete(data.subsystem_id)
                return this.success(null, this.subsystemMessages.delete)
            }
        )
    }
}
