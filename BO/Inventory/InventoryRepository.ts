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
    async findAll(): Promise<Types.InventorySummary[]> {
        const result = await this.db.query<Types.InventorySummary>(InventoryQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca inventory por ID
     */
    async findById(id: number): Promise<Types.Inventory | null> {
        const result = await this.db.query<Types.Inventory>(InventoryQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo inventory
     */
    async create(data: Partial<Types.Inventory>): Promise<Types.Inventory> {
        const result = await this.db.query<Types.Inventory>(InventoryQueries.create, [
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Actualiza inventory
     */
    async update(id: number, data: Partial<Types.Inventory>): Promise<Types.Inventory | null> {
        const result = await this.db.query<Types.Inventory>(InventoryQueries.update, [
            id,
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Elimina inventory
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountInventory>(InventoryQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si inventory existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsInventory>(InventoryQueries.exists, [id])
        return result.rows[0].exists
    }
}
