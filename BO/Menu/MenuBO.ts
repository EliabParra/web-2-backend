import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { MenuService, MenuMessages, MenuSchemas, Inputs, Types, registerMenu } from './MenuModule.js'

/**
 * Business Object para el dominio Menu.
 *
 * Orquesta transacciones de Menu y expone endpoints de API.
 */
export class MenuBO extends BaseBO {
    private service: MenuService

    constructor(container: IContainer) {
        super(container)
        registerMenu(container)
        this.service = container.resolve<MenuService>('MenuService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get menuMessages() {
        return this.i18n.use(MenuMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Menu>(
            params,
            MenuSchemas.get,
            async (data) => {
                const result: Types.Menu = await this.service.getById(data.menu_id)
                return this.success(result, this.menuMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.MenuSummary>>(
            params,
            MenuSchemas.getAll,
            async (data) => {
                const result: Array<Types.MenuSummary> = await this.service.getAll(data)
                return this.success(result, this.menuMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Menu>(
            params,
            MenuSchemas.create,
            async (data) => {
                const result: Types.Menu = await this.service.create(data)
                return this.created(result, this.menuMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Menu>(
            params,
            MenuSchemas.update,
            async (data) => {
                const result: Types.Menu = await this.service.update(data.menu_id, data)
                return this.success(result, this.menuMessages.update)
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
            MenuSchemas.delete,
            async (data) => {
                await this.service.delete(data.menu_id)
                return this.success(null, this.menuMessages.delete)
            }
        )
    }
}
