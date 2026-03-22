import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { PropertyService, PropertyMessages, PropertySchemas, Inputs, Types, registerProperty } from './PropertyModule.js'

/**
 * Business Object para el dominio Property.
 *
 * Orquesta transacciones de Property y expone endpoints de API.
 */
export class PropertyBO extends BaseBO {
    private service: PropertyService

    constructor(container: IContainer) {
        super(container)
        registerProperty(container)
        this.service = container.resolve<PropertyService>('PropertyService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get propertyMessages() {
        return this.i18n.use(PropertyMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Property>(
            params,
            PropertySchemas.get,
            async (data) => {
                const result: Types.Property = await this.service.getById(data.id)
                return this.success(result, this.propertyMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.PropertySummary>>(
            params,
            PropertySchemas.getAll,
            async () => {
                const result: Array<Types.PropertySummary> = await this.service.getAll()
                return this.success(result, this.propertyMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Property>(
            params,
            PropertySchemas.create,
            async (data) => {
                const result: Types.Property = await this.service.create(data)
                return this.created(result, this.propertyMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Property>(
            params,
            PropertySchemas.update,
            async (data) => {
                const result: Types.Property = await this.service.update(data.id, data)
                return this.success(result, this.propertyMessages.update)
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
            PropertySchemas.delete,
            async (data) => {
                await this.service.delete(data.id)
                return this.success(null, this.propertyMessages.delete)
            }
        )
    }
}
