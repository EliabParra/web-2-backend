import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { CategoryService, CategoryMessages, CategorySchemas, Inputs, Types, registerCategory } from './CategoryModule.js'

/**
 * Business Object para el dominio Category.
 *
 * Orquesta transacciones de Category y expone endpoints de API.
 */
export class CategoryBO extends BaseBO {
    private service: CategoryService

    constructor(container: IContainer) {
        super(container)
        registerCategory(container)
        this.service = container.resolve<CategoryService>('CategoryService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get categoryMessages() {
        return this.i18n.use(CategoryMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Category>(
            params,
            CategorySchemas.get,
            async (data) => {
                const result: Types.Category = await this.service.getById(data.id)
                return this.success(result, this.categoryMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.CategorySummary>>(
            params,
            CategorySchemas.getAll,
            async () => {
                const result: Array<Types.CategorySummary> = await this.service.getAll()
                return this.success(result, this.categoryMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Category>(
            params,
            CategorySchemas.create,
            async (data) => {
                const result: Types.Category = await this.service.create(data)
                return this.created(result, this.categoryMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Category>(
            params,
            CategorySchemas.update,
            async (data) => {
                const result: Types.Category = await this.service.update(data.id, data)
                return this.success(result, this.categoryMessages.update)
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
            CategorySchemas.delete,
            async (data) => {
                await this.service.delete(data.id)
                return this.success(null, this.categoryMessages.delete)
            }
        )
    }
}
