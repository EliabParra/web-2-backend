import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { ReportRepository, Errors, Types } from './ReportModule.js'

/**
 * Capa de servicio para lógica de negocio de Report.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./ReportErrors.js
 */
export class ReportService extends BOService implements Types.IReportService {
    private repo: ReportRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<ReportRepository>('ReportRepository')
    }

    async getAll(filters: Types.GetAllReportInput = {}): Promise<Types.ReportSummary[]> {
        return this.repo.findAll(filters)
    }

    /**
     * Obtiene report por ID
     * @throws ReportNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Report> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.ReportNotFoundError(id)
        }
        return entity
    }

    async create(data: Types.CreateReportInput): Promise<Types.Report> {
        this.log.trace('Creando report')
        const created = await this.repo.create(data)
        if (!created) {
            throw new Errors.ReportValidationError(['No fue posible generar el reporte'])
        }
        return created
    }

    /**
     * Actualiza report
     * @throws ReportNotFoundError si no se encuentra
     */
    async update(id: number, data: Types.UpdateReportInput): Promise<Types.Report> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.ReportNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina report
     * @throws ReportNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const exists = await this.repo.exists(id)
        if (!exists) {
            throw new Errors.ReportNotFoundError(id)
        }

        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.ReportCannotDeleteError('El reporte es virtual y no se elimina físicamente')
        }
        this.log.info('Eliminado report ' + id)
    }
}
