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

    /**
     * Obtiene todos los reports
     */
    async getAll(): Promise<Types.ReportSummary[]> {
        return this.repo.findAll()
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

    /**
     * Crea nuevo report
     */
    async create(data: Partial<Types.Report>): Promise<Types.Report> {
        this.log.info('Creando report')
        return this.repo.create(data)
    }

    /**
     * Actualiza report
     * @throws ReportNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Report>): Promise<Types.Report> {
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
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.ReportNotFoundError(id)
        }
        this.log.info('Eliminado report ' + id)
    }
}
