import { IDatabase } from '@toproc/types'
import { EquipmentQueries, Types } from './EquipmentModule.js'

/**
 * Repositorio para operaciones de base de datos de EquipmentBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class EquipmentRepository implements Types.IEquipmentRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los equipments
     */
    async findAll(filters?: Types.GetAllEquipmentInput): Promise<Types.EquipmentSummary[]> {
        const result = await this.db.query<Types.EquipmentSummary>(EquipmentQueries.findAll, [
            filters?.item_cod ?? null,
            filters?.item_na ?? null,
            filters?.category_id ?? null,
        ])
        return result.rows
    }

    /**
     * Busca equipment por ID
     */
    async findById(id: number): Promise<Types.Equipment | null> {
        const result = await this.db.query<Types.Equipment>(EquipmentQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo equipment
     */
    async create(data: Partial<Types.Equipment>): Promise<Types.Equipment> {
        const result = await this.db.query<Types.Equipment>(EquipmentQueries.create, [
            data.item_cod,
            data.item_na,
            data.category_id,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza equipment
     */
    async update(id: number, data: Partial<Types.Equipment>): Promise<Types.Equipment | null> {
        const result = await this.db.query<Types.Equipment>(EquipmentQueries.update, [
            id,
            data.item_cod,
            data.item_na,
            data.category_id,
        ])
        return result.rows[0]
    }

    /**
     * Elimina equipment
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountEquipment>(EquipmentQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si equipment existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsEquipment>(EquipmentQueries.exists, [id])
        return result.rows[0].exists
    }
}
