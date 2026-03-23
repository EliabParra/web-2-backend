import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { InventoryService, InventoryMessages, InventorySchemas, Inputs, Types, registerInventory } from './InventoryModule.js'

/**
 * Business Object para el dominio Inventory.
 * crud pero con cantidades y ubicaciones
 * Orquesta transacciones de Inventory y expone endpoints de API.
 */
export class InventoryBO extends BaseBO {
    private service: InventoryService

    constructor(container: IContainer) {
        super(container)
        registerInventory(container)
        this.service = container.resolve<InventoryService>('InventoryService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get inventoryMessages() {
        return this.i18n.use(InventoryMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Inventory>(
            params,
            InventorySchemas.get,
            async (data) => {
                const result: Types.Inventory = await this.service.getById(data.inventory_id)
                return this.success(result, this.inventoryMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.InventorySummary>>(
            params,
            InventorySchemas.getAll,
            async (data) => {
                const result: Array<Types.InventorySummary> = await this.service.getAll(data)
                return this.success(result, this.inventoryMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Inventory>(
            params,
            InventorySchemas.create,
            async (data) => {
                const result: Types.Inventory = await this.service.create(data)
                return this.created(result, this.inventoryMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Inventory>(
            params,
            InventorySchemas.update,
            async (data) => {
                const result: Types.Inventory = await this.service.update(data.inventory_id, data)
                return this.success(result, this.inventoryMessages.update)
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
        return this.exec<Inputs.DeleteInput, Types.Inventory>(
            params,
            InventorySchemas.delete,
            async (data) => {
                const deleted: Types.Inventory = await this.service.delete(data.inventory_id)
                return this.success(deleted, this.inventoryMessages.delete)
            }
        )
    }

    async addStock(params: Inputs.AddStockInput): Promise<ApiResponse> {
        return this.exec<Inputs.AddStockInput, Types.Inventory>(
            params,
            InventorySchemas.addStock,
            async (data) => {
                const result: Types.Inventory = await this.service.addStock(
                    data.inventory_id,
                    data.quantity
                )
                return this.success(result, this.inventoryMessages.addStock)
            }
        )
    }

    async removeStock(params: Inputs.RemoveStockInput): Promise<ApiResponse> {
        return this.exec<Inputs.RemoveStockInput, Types.Inventory>(
            params,
            InventorySchemas.removeStock,
            async (data) => {
                const result: Types.Inventory = await this.service.removeStock(
                    data.inventory_id,
                    data.quantity
                )
                return this.success(result, this.inventoryMessages.removeStock)
            }
        )
    }

    async moveLocation(params: Inputs.MoveLocationInput): Promise<ApiResponse> {
        return this.exec<Inputs.MoveLocationInput, Types.Inventory>(
            params,
            InventorySchemas.moveLocation,
            async (data) => {
                const result: Types.Inventory = await this.service.moveLocation(
                    data.inventory_id,
                    data.location_id
                )
                return this.success(result, this.inventoryMessages.moveLocation)
            }
        )
    }
}
