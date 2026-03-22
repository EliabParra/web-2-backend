import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { GroupService, GroupMessages, GroupSchemas, Inputs, Types, registerGroup } from './GroupModule.js'

/**
 * Business Object para el dominio Group.
 *
 * Orquesta transacciones de Group y expone endpoints de API.
 */
export class GroupBO extends BaseBO {
    private service: GroupService

    constructor(container: IContainer) {
        super(container)
        registerGroup(container)
        this.service = container.resolve<GroupService>('GroupService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get groupMessages() {
        return this.i18n.use(GroupMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Group>(
            params,
            GroupSchemas.get,
            async (data) => {
                const result: Types.Group = await this.service.getById(data.id)
                return this.success(result, this.groupMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.GroupSummary>>(
            params,
            GroupSchemas.getAll,
            async () => {
                const result: Array<Types.GroupSummary> = await this.service.getAll()
                return this.success(result, this.groupMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Group>(
            params,
            GroupSchemas.create,
            async (data) => {
                const result: Types.Group = await this.service.create(data)
                return this.created(result, this.groupMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Group>(
            params,
            GroupSchemas.update,
            async (data) => {
                const result: Types.Group = await this.service.update(data.id, data)
                return this.success(result, this.groupMessages.update)
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
            GroupSchemas.delete,
            async (data) => {
                await this.service.delete(data.id)
                return this.success(null, this.groupMessages.delete)
            }
        )
    }
}
