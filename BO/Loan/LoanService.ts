import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { LoanRepository, Errors, Types } from './LoanModule.js'

/**
 * Capa de servicio para lógica de negocio de Loan.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./LoanErrors.js
 */
export class LoanService extends BOService implements Types.ILoanService {
    private repo: LoanRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<LoanRepository>('LoanRepository')
    }

    /**
     * Obtiene todos los loans
     */
    async getAll(): Promise<Types.LoanSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene loan por ID
     * @throws LoanNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Loan> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.LoanNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo loan
     */
    async create(data: Partial<Types.Loan>): Promise<Types.Loan> {
        this.log.info('Creando loan')
        return this.repo.create(data)
    }

    /**
     * Actualiza loan
     * @throws LoanNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Loan>): Promise<Types.Loan> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.LoanNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina loan
     * @throws LoanNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.LoanNotFoundError(id)
        }
        this.log.info('Eliminado loan ' + id)
    }
}
