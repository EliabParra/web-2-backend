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

    async grantPermission(params: Inputs.GrantPermissionInput): Promise<ApiResponse> {
        return this.exec<Inputs.GrantPermissionInput, boolean>(
            params,
            ProfileSchemas.grantPermission,
            async (data) => {
                const granted = await this.service.grantPermission(data)
                return this.success(granted, this.profileMessages.grantPermission)
            }
        )
    }

    async revokePermission(params: Inputs.RevokePermissionInput): Promise<ApiResponse> {
        return this.exec<Inputs.RevokePermissionInput, boolean>(
            params,
            ProfileSchemas.revokePermission,
            async (data) => {
                const revoked = await this.service.revokePermission(data)
                return this.success(revoked, this.profileMessages.revokePermission)
            }
        )
    }

    async assignSubsystem(params: Inputs.AssignSubsystemInput): Promise<ApiResponse> {
        return this.exec<Inputs.AssignSubsystemInput, null>(
            params,
            ProfileSchemas.assignSubsystem,
            async (data) => {
                await this.service.assignSubsystem(data)
                return this.success(null, this.profileMessages.assignSubsystem)
            }
        )
    }

    async revokeSubsystem(params: Inputs.RevokeSubsystemInput): Promise<ApiResponse> {
        return this.exec<Inputs.RevokeSubsystemInput, null>(
            params,
            ProfileSchemas.revokeSubsystem,
            async (data) => {
                await this.service.revokeSubsystem(data)
                return this.success(null, this.profileMessages.revokeSubsystem)
            }
        )
    }

    async assignMenu(params: Inputs.AssignMenuInput): Promise<ApiResponse> {
        return this.exec<Inputs.AssignMenuInput, null>(
            params,
            ProfileSchemas.assignMenu,
            async (data) => {
                await this.service.assignMenu(data)
                return this.success(null, this.profileMessages.assignMenu)
            }
        )
    }

    async revokeMenu(params: Inputs.RevokeMenuInput): Promise<ApiResponse> {
        return this.exec<Inputs.RevokeMenuInput, null>(
            params,
            ProfileSchemas.revokeMenu,
            async (data) => {
                await this.service.revokeMenu(data)
                return this.success(null, this.profileMessages.revokeMenu)
            }
        )
    }

    async assignOption(params: Inputs.AssignOptionInput): Promise<ApiResponse> {
        return this.exec<Inputs.AssignOptionInput, null>(
            params,
            ProfileSchemas.assignOption,
            async (data) => {
                await this.service.assignOption(data)
                return this.success(null, this.profileMessages.assignOption)
            }
        )
    }

    async revokeOption(params: Inputs.RevokeOptionInput): Promise<ApiResponse> {
        return this.exec<Inputs.RevokeOptionInput, null>(
            params,
            ProfileSchemas.revokeOption,
            async (data) => {
                await this.service.revokeOption(data)
                return this.success(null, this.profileMessages.revokeOption)
            }
        )
    }
}
