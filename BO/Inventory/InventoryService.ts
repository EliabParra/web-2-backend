import { BOService } from '@toproc/bo'
import type { IContainer } from '@toproc/types'
import { InventoryRepository, InventoryMessages, Errors, Types } from './InventoryModule.js'

/**
 * Capa de servicio para lógica de negocio de Inventory.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./InventoryErrors.js
 */
export class InventoryService extends BOService implements Types.IInventoryService {
    private repo: InventoryRepository
    private readonly EQUIPMENT_CATEGORY_TYPE_ID = 1
    private readonly COMPONENT_CATEGORY_TYPE_ID = 2

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<InventoryRepository>('InventoryRepository')
    }

    private get messages() {
        return this.i18n.use(InventoryMessages)
    }

    /**
     * Obtiene todos los inventorys
     */
    async getAll(filters?: Types.GetAllInventoryInput): Promise<Types.InventorySummary[]> {
        return this.repo.findAll(filters)
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
        const itemId = Number(data.item_id)
        const locationId = Number(data.location_id)
        const requestedQty = Number(data.inventory_qt)

        const categoryTypeId = await this.repo.getItemCategoryType(itemId)
        if (!categoryTypeId) {
            throw new Errors.InventoryValidationError([this.messages.validation.item.invalidType])
        }

        const existingInLocation = await this.repo.findByItemAndLocation(itemId, locationId)
        const existingActiveByItem = await this.repo.findActiveByItem(itemId)

        if (categoryTypeId === this.EQUIPMENT_CATEGORY_TYPE_ID) {
            if (existingActiveByItem && existingActiveByItem.location_id !== locationId) {
                throw new Errors.InventoryAlreadyExistsError('item_id', String(itemId))
            }

            if (existingInLocation) {
                const updated = await this.repo.update(existingInLocation.inventory_id, {
                    inventory_qt: 1,
                    location_id: locationId,
                })
                if (!updated) throw new Errors.InventoryNotFoundError(existingInLocation.inventory_id)
                return updated
            }

            return this.repo.create({
                item_id: itemId,
                location_id: locationId,
                inventory_qt: 1,
            })
        }

        if (categoryTypeId === this.COMPONENT_CATEGORY_TYPE_ID) {
            if (existingInLocation) {
                const updated = await this.repo.update(existingInLocation.inventory_id, {
                    inventory_qt: Math.max(0, Number(existingInLocation.inventory_qt) + requestedQty),
                    location_id: locationId,
                })
                if (!updated) throw new Errors.InventoryNotFoundError(existingInLocation.inventory_id)
                return updated
            }

            return this.repo.create({
                item_id: itemId,
                location_id: locationId,
                inventory_qt: requestedQty,
            })
        }

        throw new Errors.InventoryValidationError([this.messages.validation.item.invalidType])
    }

    /**
     * Actualiza inventory
     * @throws InventoryNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Inventory>): Promise<Types.Inventory> {
        const current = await this.repo.findById(id)
        if (!current) throw new Errors.InventoryNotFoundError(id)

        const categoryTypeId = Number(current.category_type_id ?? await this.repo.getItemCategoryType(current.item_id))
        const nextQty =
            data.inventory_qt !== undefined ? Number(data.inventory_qt) : Number(current.inventory_qt)

        if (categoryTypeId === this.EQUIPMENT_CATEGORY_TYPE_ID && nextQty > 1) {
            throw new Errors.InventoryValidationError([
                this.messages.validation.quantity.equipmentUnit,
            ])
        }

        const updated = await this.repo.update(id, data)
        if (!updated) {
            throw new Errors.InventoryNotFoundError(id)
        }
        return updated
    }

    async addStock(id: number, quantity: number): Promise<Types.Inventory> {
        const current = await this.repo.findById(id)
        if (!current) throw new Errors.InventoryNotFoundError(id)

        const categoryTypeId = Number(current.category_type_id ?? await this.repo.getItemCategoryType(current.item_id))
        const currentQty = Number(current.inventory_qt)

        const nextQty =
            categoryTypeId === this.EQUIPMENT_CATEGORY_TYPE_ID
                ? 1
                : currentQty + Number(quantity)

        const updated = await this.repo.update(id, { inventory_qt: nextQty })
        if (!updated) throw new Errors.InventoryNotFoundError(id)
        return updated
    }

    async removeStock(id: number, quantity: number): Promise<Types.Inventory> {
        const current = await this.repo.findById(id)
        if (!current) throw new Errors.InventoryNotFoundError(id)

        const categoryTypeId = Number(current.category_type_id ?? await this.repo.getItemCategoryType(current.item_id))
        const currentQty = Number(current.inventory_qt)

        const nextQty =
            categoryTypeId === this.EQUIPMENT_CATEGORY_TYPE_ID
                ? 0
                : Math.max(0, currentQty - Number(quantity))

        const updated = await this.repo.update(id, { inventory_qt: nextQty })
        if (!updated) throw new Errors.InventoryNotFoundError(id)
        return updated
    }

    async moveLocation(id: number, locationId: number): Promise<Types.Inventory> {
        const current = await this.repo.findById(id)
        if (!current) throw new Errors.InventoryNotFoundError(id)

        const updated = await this.repo.update(id, { location_id: locationId })
        if (!updated) throw new Errors.InventoryNotFoundError(id)
        return updated
    }

    /**
     * Resetea inventory a cantidad 0 (soft delete)
     * @throws InventoryNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<Types.Inventory> {
        const deleted = await this.repo.delete(id)
        if (!deleted) throw new Errors.InventoryNotFoundError(id)
        return deleted
    }
}
