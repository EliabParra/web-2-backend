import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { ProfileService, ProfileMessages, ProfileSchemas, Inputs, Types, registerProfile } from './ProfileModule.js'

/**
 * Business Object para el dominio Profile.
 *
 * Orquesta transacciones de Profile y expone endpoints de API.
 */
export class ProfileBO extends BaseBO {
    private service: ProfileService

    constructor(container: IContainer) {
        super(container)
        registerProfile(container)
        this.service = container.resolve<ProfileService>('ProfileService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get profileMessages() {
        return this.i18n.use(ProfileMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Profile>(
            params,
            ProfileSchemas.get,
            async (data) => {
                const result: Types.Profile = await this.service.getById(data.profile_id)
                return this.success(result, this.profileMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.ProfileSummary>>(
            params,
            ProfileSchemas.getAll,
            async (data) => {
                const result: Array<Types.ProfileSummary> = await this.service.getAll(data)
                return this.success(result, this.profileMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Profile>(
            params,
            ProfileSchemas.create,
            async (data) => {
                const result: Types.Profile = await this.service.create(data)
                return this.created(result, this.profileMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Profile>(
            params,
            ProfileSchemas.update,
            async (data) => {
                const result: Types.Profile = await this.service.update(data.profile_id, data)
                return this.success(result, this.profileMessages.update)
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
            ProfileSchemas.delete,
            async (data) => {
                await this.service.delete(data.profile_id)
                return this.success(null, this.profileMessages.delete)
            }
        )
    }
}
