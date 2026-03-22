import { IDatabase } from '@toproc/types'
import { OptionQueries, Types } from './OptionModule.js'

/**
 * Repositorio para operaciones de base de datos de OptionBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class OptionRepository implements Types.IOptionRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los options
     */
    async findAll(): Promise<Types.OptionSummary[]> {
        const result = await this.db.query<Types.OptionSummary>(OptionQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca option por ID
     */
    async findById(id: number): Promise<Types.Option | null> {
        const result = await this.db.query<Types.Option>(OptionQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo option
     */
    async create(data: Partial<Types.Option>): Promise<Types.Option> {
        const result = await this.db.query<Types.Option>(OptionQueries.create, [
            data.option_na,
            data.method_id,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza option
     */
    async update(id: number, data: Partial<Types.Option>): Promise<Types.Option | null> {
        const result = await this.db.query<Types.Option>(OptionQueries.update, [
            id,
            data.option_na,
            data.method_id,
        ])
        return result.rows[0]
    }

    /**
     * Elimina option
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountOption>(OptionQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si option existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsOption>(OptionQueries.exists, [id])
        return result.rows[0].exists
    }
}
