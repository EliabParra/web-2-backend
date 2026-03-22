import { IDatabase } from '@toproc/types'
import { SubsystemQueries, Types } from './SubsystemModule.js'

/**
 * Repositorio para operaciones de base de datos de SubsystemBO.
 *
 * Todas las consultas a la base de datos se encapsulan aquí.
 * Los nombres de queries deben coincidir con entradas en src/config/queries.json
 */
export class SubsystemRepository implements Types.ISubsystemRepository {
    constructor(private readonly db: IDatabase) {}

    /**
     * Busca todos los subsystems
     */
    async findAll(): Promise<Types.SubsystemSummary[]> {
        const result = await this.db.query<Types.SubsystemSummary>(SubsystemQueries.findAll, [])
        return result.rows
    }

    /**
     * Busca subsystem por ID
     */
    async findById(id: number): Promise<Types.Subsystem | null> {
        const result = await this.db.query<Types.Subsystem>(SubsystemQueries.findById, [id])
        return result.rows[0]
    }

    /**
     * Crea nuevo subsystem
     */
    async create(data: Partial<Types.Subsystem>): Promise<Types.Subsystem> {
        const result = await this.db.query<Types.Subsystem>(SubsystemQueries.create, [
            data.subsystem_na,
        ])
        return result.rows[0]
    }

    /**
     * Actualiza subsystem
     */
    async update(id: number, data: Partial<Types.Subsystem>): Promise<Types.Subsystem | null> {
        const result = await this.db.query<Types.Subsystem>(SubsystemQueries.update, [
            id,
            data.subsystem_na,
        ])
        return result.rows[0]
    }

    /**
     * Elimina subsystem
     */
    async delete(id: number): Promise<boolean> {
        const result = await this.db.query<Types.RowCountSubsystem>(SubsystemQueries.delete, [id])
        return result.rowCount !== null && result.rowCount > 0
    }

    /**
     * Verifica si subsystem existe
     */
    async exists(id: number): Promise<boolean> {
        const result = await this.db.query<Types.ExistsSubsystem>(SubsystemQueries.exists, [id])
        return result.rows[0].exists
    }
}
