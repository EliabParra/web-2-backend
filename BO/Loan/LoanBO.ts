import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { LoanService, LoanMessages, LoanSchemas, Inputs, Types, registerLoan } from './LoanModule.js'

/**
 * Business Object para el dominio Loan.
 * get y get all requests, y en request prestamo estamos haciendo un movimiento pero como solicitud, hay que llenar movement_type
 * accept prestamo, reject prestamo, register prestamo, get y get all prestamos, y get user loans para ver prestamos
 * historicos de un usuario
 * Orquesta transacciones de Loan y expone endpoints de API.
 */
export class LoanBO extends BaseBO {
    private service: LoanService

    constructor(container: IContainer) {
        super(container)
        registerLoan(container)
        this.service = container.resolve<LoanService>('LoanService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get loanMessages() {
        return this.i18n.use(LoanMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Loan>(
            params,
            LoanSchemas.get,
            async (data) => {
                const result: Types.Loan = await this.service.getById(data.id)
                return this.success(result, this.loanMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.LoanSummary>>(
            params,
            LoanSchemas.getAll,
            async () => {
                const result: Array<Types.LoanSummary> = await this.service.getAll()
                return this.success(result, this.loanMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Loan>(
            params,
            LoanSchemas.create,
            async (data) => {
                const result: Types.Loan = await this.service.create(data)
                return this.created(result, this.loanMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Loan>(
            params,
            LoanSchemas.update,
            async (data) => {
                const result: Types.Loan = await this.service.update(data.id, data)
                return this.success(result, this.loanMessages.update)
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
            LoanSchemas.delete,
            async (data) => {
                await this.service.delete(data.id)
                return this.success(null, this.loanMessages.delete)
            }
        )
    }
}
