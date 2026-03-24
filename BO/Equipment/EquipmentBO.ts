import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { EquipmentService, EquipmentMessages, EquipmentSchemas, Inputs, Types, registerEquipment } from './EquipmentModule.js'

/**
 * Business Object para el dominio Equipment.
 *
 * Orquesta transacciones de Equipment y expone endpoints de API.
 */
export class EquipmentBO extends BaseBO {
    private service: EquipmentService

    constructor(container: IContainer) {
        super(container)
        registerEquipment(container)
        this.service = container.resolve<EquipmentService>('EquipmentService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get equipmentMessages() {
        return this.i18n.use(EquipmentMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Equipment>(
            params,
            EquipmentSchemas.get,
            async (data) => {
                const result: Types.Equipment = await this.service.getById(data.item_id)
                return this.success(result, this.equipmentMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.EquipmentSummary>>(
            params,
            EquipmentSchemas.getAll,
            async (data) => {
                const result: Array<Types.EquipmentSummary> = await this.service.getAll(data)
                return this.success(result, this.equipmentMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Equipment>(
            params,
            EquipmentSchemas.create,
            async (data) => {
                const result: Types.Equipment = await this.service.create(data)
                return this.created(result, this.equipmentMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Equipment>(
            params,
            EquipmentSchemas.update,
            async (data) => {
                const result: Types.Equipment = await this.service.update(data.item_id, data)
                return this.success(result, this.equipmentMessages.update)
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
            EquipmentSchemas.delete,
            async (data) => {
                await this.service.delete(data.item_id)
                return this.success(null, this.equipmentMessages.delete)
            }
        )
    }
}
