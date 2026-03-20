import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { LocationService, LocationMessages, LocationSchemas, Inputs, Types, registerLocation } from './LocationModule.js'

/**
 * Business Object para el dominio Location.
 *
 * Orquesta transacciones de Location y expone endpoints de API.
 */
export class LocationBO extends BaseBO {
    private service: LocationService

    constructor(container: IContainer) {
        super(container)
        registerLocation(container)
        this.service = container.resolve<LocationService>('LocationService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get locationMessages() {
        return this.i18n.use(LocationMessages)
    }

    /**
     * Operación GetAll
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async getAll(params: Inputs.GetAllInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetAllInput, Array<Types.LocationSummary>>(
            params,
            LocationSchemas.getAll,
            async () => {
                const result: Array<Types.LocationSummary> = await this.service.getAll()
                return this.success(result, this.locationMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Location>(
            params,
            LocationSchemas.create,
            async (data) => {
                const result: Types.Location = await this.service.create(data)
                return this.created(result, this.locationMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Location>(
            params,
            LocationSchemas.update,
            async (data) => {
                const result: Types.Location = await this.service.update(data.location_id, data)
                return this.success(result, this.locationMessages.update)
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
            LocationSchemas.delete,
            async (data) => {
                await this.service.delete(data.location_id)
                return this.success(null, this.locationMessages.delete)
            }
        )
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Location>(
            params,
            LocationSchemas.get,
            async (data) => {
                const result: Types.Location = await this.service.getById(data.location_id)
                return this.success(result, this.locationMessages.get)
            }
        )
    }
}
