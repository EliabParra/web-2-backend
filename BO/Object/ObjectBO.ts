import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { ObjectService, ObjectMessages, ObjectSchemas, Inputs, Types, registerObject } from './ObjectModule.js'

/**
 * Business Object para el dominio Object.
 *
 * Orquesta transacciones de Object y expone endpoints de API.
 */
export class ObjectBO extends BaseBO {
    private service: ObjectService

    constructor(container: IContainer) {
        super(container)
        registerObject(container)
        this.service = container.resolve<ObjectService>('ObjectService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get objectMessages() {
        return this.i18n.use(ObjectMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Object>(
            params,
            ObjectSchemas.get,
            async (data) => {
                const result: Types.Object = await this.service.getById(data.object_id)
                return this.success(result, this.objectMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.ObjectSummary>>(
            params,
            ObjectSchemas.getAll,
            async () => {
                const result: Array<Types.ObjectSummary> = await this.service.getAll()
                return this.success(result, this.objectMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Object>(
            params,
            ObjectSchemas.create,
            async (data) => {
                const result: Types.Object = await this.service.create(data)
                return this.created(result, this.objectMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Object>(
            params,
            ObjectSchemas.update,
            async (data) => {
                const result: Types.Object = await this.service.update(data.object_id, data)
                return this.success(result, this.objectMessages.update)
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
            ObjectSchemas.delete,
            async (data) => {
                await this.service.delete(data.object_id)
                return this.success(null, this.objectMessages.delete)
            }
        )
    }
}
