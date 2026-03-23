import { IDatabase } from '@toproc/types'
import { InventoryQueries, Types } from './InventoryModule.js'

/**
 * Repositorio para operaciones de base de datos de InventoryBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class InventoryRepository implements Types.IInventoryRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los inventorys
     */
    async findAll(filters?: Types.GetAllInventoryInput): Promise<Types.InventorySummary[]> {
        const result = await this.db.query<Types.InventorySummary>(InventoryQueries.findAll, [
            filters?.item_id ?? null,
            filters?.location_id ?? null,
            filters?.category_type_id ?? null,
        ])
        return result.rows
    }

    /**
     * Busca inventory por ID
     */
    async findById(id: number): Promise<Types.Inventory | null> {
        const result = await this.db.query<Types.Inventory>(InventoryQueries.findById, [id])
        return result.rows[0]
    }

    async findByItemAndLocation(itemId: number, locationId: number): Promise<Types.Inventory | null> {
        const result = await this.db.query<Types.Inventory>(InventoryQueries.findByItemAndLocation, [
            itemId,
            locationId,
        ])
        return result.rows[0]
    }

    async findActiveByItem(itemId: number): Promise<Types.Inventory | null> {
        const result = await this.db.query<Types.Inventory>(InventoryQueries.findActiveByItem, [itemId])
        return result.rows[0]
    }

    async getItemCategoryType(itemId: number): Promise<number | null> {
        const result = await this.db.query<{ category_type_id: number }>(
            InventoryQueries.getItemCategoryType,
            [itemId]
        )
        return result.rows[0]?.category_type_id ?? null
    }

    /**
     * Crea nuevo inventory
     */
    async create(data: Partial<Types.Inventory>): Promise<Types.Inventory> {
        const result = await this.db.query<Types.Inventory>(InventoryQueries.create, [
            data.inventory_qt,
            data.location_id,
            data.item_id,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza inventory
     */
    async update(id: number, data: Partial<Types.Inventory>): Promise<Types.Inventory | null> {
        const result = await this.db.query<Types.Inventory>(InventoryQueries.update, [
            id,
            data.inventory_qt,
            data.location_id,
        ])
        return result.rows[0]
    }

    /**
     * Elimina inventory
     */
    async delete(id: number): Promise<Types.Inventory> {
        const result = await this.db.query<Types.Inventory>(InventoryQueries.delete, [id])
        return result.rows[0]
    }

    /**
     * Verifica si inventory existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsInventory>(InventoryQueries.exists, [id])
        return result.rows[0].exists
    }
}
