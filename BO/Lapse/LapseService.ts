import { BOService } from '@toproc/bo'
import { parseDateInput } from '@toproc/utils'
import type { IContainer } from '@toproc/types'
import { LapseRepository, Errors, Types } from './LapseModule.js'

/**
 * Capa de servicio para lógica de negocio de Lapse.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./LapseErrors.js
 */
export class LapseService extends BOService implements Types.ILapseService {
    private repo: LapseRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<LapseRepository>('LapseRepository')
    }

    private normalizeDate(value: string | Date | null | undefined): Date | null {
        if (value == null) return null
        return parseDateInput(value)
    }

    private validateDateRange(start: string | Date | null | undefined, close: string | Date | null | undefined): void {
        const startDate = this.normalizeDate(start)
        const closeDate = this.normalizeDate(close)

        if (start != null && !startDate) {
            throw new Errors.LapseValidationError(['lapse_start_dt inválida'])
        }

        if (close != null && !closeDate) {
            throw new Errors.LapseValidationError(['lapse_close_dt inválida'])
        }

        if (startDate && closeDate && startDate.getTime() > closeDate.getTime()) {
            throw new Errors.LapseValidationError([
                'lapse_start_dt no puede ser mayor a lapse_close_dt',
            ])
        }
    }

    /**
     * Obtiene todos los lapses
     */
    async getAll(filters?: Types.GetAllLapseInput): Promise<Types.LapseSummary[]> {
        await this.repo.syncActiveByDate()
        return this.repo.findAll(filters)
    }

    /**
     * Obtiene lapse por ID
     * @throws LapseNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Lapse> {
        await this.repo.syncActiveByDate()
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.LapseNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo lapse
     */
    async create(data: Partial<Types.Lapse>): Promise<Types.Lapse> {
        this.log.trace('Creando lapse')
        this.validateDateRange(data.lapse_start_dt, data.lapse_close_dt)

        const created = await this.repo.create({
            ...data,
            lapse_act: false,
        })

        if (!created) {
            throw new Errors.LapseValidationError(['No se pudo crear el período académico'])
        }

        await this.repo.syncActiveByDate()

        const refreshed = await this.repo.findById(created.lapse_id)
        if (!refreshed) {
            throw new Errors.LapseNotFoundError(created.lapse_id)
        }

        return refreshed
    }

    /**
     * Actualiza lapse
     * @throws LapseNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Lapse>): Promise<Types.Lapse> {
        const current = await this.repo.findById(id)
        if (!current) {
            throw new Errors.LapseNotFoundError(id)
        }

        this.validateDateRange(
            data.lapse_start_dt ?? current.lapse_start_dt,
            data.lapse_close_dt ?? current.lapse_close_dt
        )

        const updated = await this.repo.update(id, {
            ...data,
            lapse_act: false,
        })
        if (!updated) {
            throw new Errors.LapseNotFoundError(id)
        }

        await this.repo.syncActiveByDate()

        const refreshed = await this.repo.findById(id)
        if (!refreshed) {
            throw new Errors.LapseNotFoundError(id)
        }

        return refreshed
    }

    /**
     * Elimina lapse
     * @throws LapseNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.LapseNotFoundError(id)
        }
        await this.repo.syncActiveByDate()
        this.log.info('Eliminado lapse ' + id)
    }
}
