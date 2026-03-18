import { BOService, IContainer, IConfig, IDatabase } from '../../src/core/business-objects/index.js'
import type { ILogger } from '../../src/types/core.js'
import { LocationRepository, Errors, Types } from './LocationModule.js'

/**
 * Capa de servicio para lógica de negocio de Location.
 *
 * Contiene lógica de negocio pura, libre de concerns HTTP.
 * Lanza errores específicos del dominio desde ./LocationErrors.js
 */
export class LocationService extends BOService implements Types.ILocationService {
    private repo: LocationRepository

    constructor(container: IContainer) {
        super(container)
        this.repo = container.resolve<LocationRepository>('LocationRepository')
    }

    /**
     * Obtiene todos los locations
     */
    async getAll(): Promise<Types.LocationSummary[]> {
        return this.repo.findAll()
    }

    /**
     * Obtiene location por ID
     * @throws LocationNotFoundError si no se encuentra
     */
    async getById(id: number): Promise<Types.Location> {
        const entity = await this.repo.findById(id)
        if (!entity) {
            throw new Errors.LocationNotFoundError(id)
        }
        return entity
    }

    /**
     * Crea nuevo location
     */
    async create(data: Partial<Types.Location>): Promise<Types.Location> {
        this.log.info('Creando location')
        return this.repo.create(data)
    }

    /**
     * Actualiza location
     * @throws LocationNotFoundError si no se encuentra
     */
    async update(id: number, data: Partial<Types.Location>): Promise<Types.Location> {
        const updated = await this.repo.update(id, data)
        if (!updated) throw new Errors.LocationNotFoundError(id)
        return updated
    }

    /**
     * Elimina location
     * @throws LocationNotFoundError si no se encuentra
     */
    async delete(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)
        if (!deleted) {
            throw new Errors.LocationNotFoundError(id)
        }
        this.log.info('Eliminado location ' + id)
    }
}
