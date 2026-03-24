import { BaseBO } from '@toproc/bo'
import { formatCaracasDateTime } from '@toproc/utils'
import type { IContainer, ApiResponse } from '@toproc/types'
import { UserService, UserMessages, UserSchemas, Inputs, Types, registerUser } from './UserModule.js'

/**
 * Business Object para el dominio User.
 *
 * Orquesta transacciones de User y expone endpoints de API.
 */
export class UserBO extends BaseBO {
    private service: UserService

    constructor(container: IContainer) {
        super(container)
        registerUser(container)
        this.service = container.resolve<UserService>('UserService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get userMessages() {
        return this.i18n.use(UserMessages)
    }

    private formatDateTime(value: unknown): unknown {
        return formatCaracasDateTime(value, this.i18n.currentLocale) ?? value
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.User>(
            params,
            UserSchemas.get,
            async (data) => {
                const result: Types.User = await this.service.getById(data.user_id)
                const formatted: Types.User = {
                    ...result,
                    user_created_dt: this.formatDateTime(result.user_created_dt) as string,
                    user_updated_dt: this.formatDateTime(result.user_updated_dt) as string,
                    user_last_login_dt: this.formatDateTime(result.user_last_login_dt) as string,
                    user_em_verified_dt: this.formatDateTime(result.user_em_verified_dt) as string,
                }
                return this.success(formatted, this.userMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.UserSummary>>(
            params,
            UserSchemas.getAll,
            async (data) => {
                const result: Array<Types.UserSummary> = await this.service.getAll(data)
                const formatted = result.map((item) => ({
                    ...item,
                    user_created_dt: this.formatDateTime(item.user_created_dt) as string,
                    user_updated_dt: this.formatDateTime(item.user_updated_dt) as string,
                    user_last_login_dt: this.formatDateTime(item.user_last_login_dt) as string,
                    user_em_verified_dt: this.formatDateTime(item.user_em_verified_dt) as string,
                }))
                return this.success(formatted, this.userMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.User>(
            params,
            UserSchemas.create,
            async (data) => {
                const result: Types.User = await this.service.create(data)
                const formatted: Types.User = {
                    ...result,
                    user_created_dt: this.formatDateTime(result.user_created_dt) as string,
                    user_updated_dt: this.formatDateTime(result.user_updated_dt) as string,
                    user_last_login_dt: this.formatDateTime(result.user_last_login_dt) as string,
                    user_em_verified_dt: this.formatDateTime(result.user_em_verified_dt) as string,
                }
                return this.created(formatted, this.userMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.User>(
            params,
            UserSchemas.update,
            async (data) => {
                const result: Types.User = await this.service.update(data.user_id, data)
                const formatted: Types.User = {
                    ...result,
                    user_created_dt: this.formatDateTime(result.user_created_dt) as string,
                    user_updated_dt: this.formatDateTime(result.user_updated_dt) as string,
                    user_last_login_dt: this.formatDateTime(result.user_last_login_dt) as string,
                    user_em_verified_dt: this.formatDateTime(result.user_em_verified_dt) as string,
                }
                return this.success(formatted, this.userMessages.update)
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
            UserSchemas.delete,
            async (data) => {
                await this.service.delete(data.user_id)
                return this.success(null, this.userMessages.delete)
            }
        )
    }
}
