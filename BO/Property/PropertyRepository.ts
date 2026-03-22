import { IDatabase } from '@toproc/types'
import { PropertyQueries, Types } from './PropertyModule.js'

/**
 * Repositorio para operaciones de base de datos de PropertyBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class PropertyRepository implements Types.IPropertyRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los propertys
     */
    async findAll(): Promise<Types.PropertySummary[]> {
        const result = await this.db.query<Types.PropertySummary>(PropertyQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca property por ID
     */
    async findById(id: number): Promise<Types.Property | null> {
        const result = await this.db.query<Types.Property>(PropertyQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo property
     */
    async create(data: Partial<Types.Property>): Promise<Types.Property> {
        const result = await this.db.query<Types.Property>(PropertyQueries.create, [
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Actualiza property
     */
    async update(id: number, data: Partial<Types.Property>): Promise<Types.Property | null> {
        const result = await this.db.query<Types.Property>(PropertyQueries.update, [
            id,
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Elimina property
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountProperty>(PropertyQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si property existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsProperty>(PropertyQueries.exists, [id])
        return result.rows[0].exists
    }
}
