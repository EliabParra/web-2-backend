import { BaseBO } from '@toproc/bo'
import type { IContainer, ApiResponse } from '@toproc/types'
import { ReportService, ReportMessages, ReportSchemas, Inputs, Types, registerReport } from './ReportModule.js'

/**
 * Business Object para el dominio Report.
 *
 * Orquesta transacciones de Report y expone endpoints de API.
 */
export class ReportBO extends BaseBO {
    private service: ReportService

    constructor(container: IContainer) {
        super(container)
        registerReport(container)
        this.service = container.resolve<ReportService>('ReportService')
    }

    /**
     * Helpers para mensajes tipados
     */
    private get reportMessages() {
        return this.i18n.use(ReportMessages)
    }

    /**
     * Operación Get
     *
     * @param params - Parámetros de la solicitud
     * @returns ApiResponse con el resultado
     */
    async get(params: Inputs.GetInput): Promise<ApiResponse> {
        return this.exec<Inputs.GetInput, Types.Report>(
            params,
            ReportSchemas.get,
            async (data) => {
                const result: Types.Report = await this.service.getById(data.id)
                return this.success(result, this.reportMessages.get)
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
        return this.exec<Inputs.GetAllInput, Array<Types.ReportSummary>>(
            params,
            ReportSchemas.getAll,
            async (data) => {
                const result: Array<Types.ReportSummary> = await this.service.getAll(data)
                return this.success(result, this.reportMessages.getAll)
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
        return this.exec<Inputs.CreateInput, Types.Report>(
            params,
            ReportSchemas.create,
            async (data) => {
                const result: Types.Report = await this.service.create(data)
                return this.created(result, this.reportMessages.create)
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
        return this.exec<Inputs.UpdateInput, Types.Report>(
            params,
            ReportSchemas.update,
            async (data) => {
                const result: Types.Report = await this.service.update(data.id, {
                    id: data.id,
                    user_id: data.user_id,
                    lapse_id: data.lapse_id,
                    from_dt: data.from_dt,
                    to_dt: data.to_dt,
                })
                return this.success(result, this.reportMessages.update)
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
            ReportSchemas.delete,
            async (data) => {
                await this.service.delete(data.id)
                return this.success(null, this.reportMessages.delete)
            }
        )
    }
}
