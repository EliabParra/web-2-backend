import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { EquipmentRepository, Errors, Types } from './EquipmentModule.js'

/**
 * Capa de servicio para lógica de negocio de Equipment.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./EquipmentErrors.js
 */
export class EquipmentService extends BOService implements Types.IEquipmentService {
    private repo: EquipmentRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<EquipmentRepository>('EquipmentRepository')
    }

    /**
     * Obtiene todos los equipments
     */
    async getAll(): Promise<Types.EquipmentSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene equipment por ID
     * @throws EquipmentNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Equipment> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.EquipmentNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo equipment
     */
    async create(data: Partial<Types.Equipment>): Promise<Types.Equipment> {
        this.log.trace('Creando equipment')
        return this.repo.create(data)
    }

    /**
     * Actualiza equipment
     * @throws EquipmentNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Equipment>): Promise<Types.Equipment> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.EquipmentNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina equipment
     * @throws EquipmentNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.EquipmentNotFoundError(id)
        }
        this.log.info('Eliminado equipment ' + id)
    }
}
