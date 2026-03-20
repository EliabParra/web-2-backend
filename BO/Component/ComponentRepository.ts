import { IDatabase } from '@toproc/types'
import { ComponentQueries, Types } from './ComponentModule.js'

/**
 * Repositorio para operaciones de base de datos de ComponentBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class ComponentRepository implements Types.IComponentRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los components
     */
    async findAll(): Promise<Types.ComponentSummary[]> {
        const result = await this.db.query<Types.ComponentSummary>(ComponentQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca component por ID
     */
    async findById(id: number): Promise<Types.Component | null> {
        const result = await this.db.query<Types.Component>(ComponentQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo component
     */
    async create(data: Partial<Types.Component>): Promise<Types.Component> {
        const result = await this.db.query<Types.Component>(ComponentQueries.create, [
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Actualiza component
     */
    async update(id: number, data: Partial<Types.Component>): Promise<Types.Component | null> {
        const result = await this.db.query<Types.Component>(ComponentQueries.update, [
            id,
            // TODO: Mapear campos de data a parámetros del query
        ])
        return result.rows[0]
    }

    /**
     * Elimina component
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountComponent>(ComponentQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si component existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsComponent>(ComponentQueries.exists, [id])
        return result.rows[0].exists
    }
}
