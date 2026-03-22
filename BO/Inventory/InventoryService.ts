import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { InventoryRepository, Errors, Types } from './InventoryModule.js'

/**
 * Capa de servicio para lógica de negocio de Inventory.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./InventoryErrors.js
 */
export class InventoryService extends BOService implements Types.IInventoryService {
    private repo: InventoryRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<InventoryRepository>('InventoryRepository')
    }

    /**
     * Obtiene todos los inventorys
     */
    async getAll(): Promise<Types.InventorySummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene inventory por ID
     * @throws InventoryNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Inventory> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.InventoryNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo inventory
     */
    async create(data: Partial<Types.Inventory>): Promise<Types.Inventory> {
        this.log.trace('Creando inventory')
        return this.repo.create(data)
    }

    /**
     * Actualiza inventory
     * @throws InventoryNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Inventory>): Promise<Types.Inventory> {
        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.InventoryNotFoundError(id)
        }
        return updated
    }

    /**
     * Elimina inventory
     * @throws InventoryNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.InventoryNotFoundError(id)
        }
        this.log.info('Eliminado inventory ' + id)
    }
}
