import {
    IDatabase,
    ILogger,
    IContainer,
    ITransactionMapper,
    TransactionRoute,
} from '../../types/core.js'

// TODO(REVERT_NAMING): Revert transaction_nu to transaction_number, object_na to object_name, method_na to method_name
const TxQueries = {
    // TODO(REVERT_NAMING): Singular tables & N:M profiles
    loadDataTx: `
        SELECT t.transaction_nu as tx, o.object_na, m.method_na
        FROM security.transaction t
        INNER JOIN security.method m ON t.method_id = m.method_id
        INNER JOIN security.object o ON t.object_id = o.object_id
    `,
}

/** Row resultado de la query de transacciones */
// TODO(REVERT_NAMING): Revert object_na to object_name, method_na to method_name
interface TxRow {
    tx: number | string
    object_na: string
    method_na: string
    [key: string]: unknown
}

/**
 * Mapeador de transacciones que resuelve códigos TX a rutas de ejecución (BO/Método).
 *
 * Mantiene un caché en memoria de la tabla `security.methods` para resolución rápida.
 * Se encarga de cargar y mantener la relación entre `tx` (código de transacción)
 * y el par `{ objectName, methodName }` que lo maneja.
 *
 * @class TransactionMapper
 * @implements {ITransactionMapper}
 */
export class TransactionMapper implements ITransactionMapper {
    private txMap: Map<number, TransactionRoute> = new Map()
    private db: IDatabase
    private log: ILogger

    /**
     * Crea una instancia de TransactionMapper.
     *
     * @param container - Contenedor IoC
     */
    constructor(container: IContainer) {
        this.db = container.resolve<IDatabase>('db')
        this.log = container.resolve<ILogger>('log').child({ category: 'TransactionMapper' })
    }

    /**
     * Carga el mapa de transacciones desde la base de datos.
     * Ejecuta `TxQueries.loadDataTx` y puebla el caché en memoria.
     *
     * @returns {Promise<void>}
     * @throws {Error} Si hay un error de conexión o base de datos
     */
    async load(): Promise<void> {
        try {
            const result = await this.db.query<TxRow>(TxQueries.loadDataTx)

            if (!result || !result.rows) {
                this.log.error('TransactionMapper: loadDataTx no retornó filas')
                return
            }

            this.txMap.clear()

            for (const row of result.rows) {
                const tx = typeof row.tx === 'number' ? row.tx : Number(row.tx)

                // TODO(REVERT_NAMING): Revert object_na to object_name, method_na to method_name
                if (Number.isFinite(tx) && row.object_na && row.method_na) {
                    this.txMap.set(tx, {
                        objectName: row.object_na,
                        methodName: row.method_na,
                    })
                }
            }

            this.log.info(`TransactionMapper: Carga exitosa de ${this.txMap.size} transacciones`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            this.log.error(`TransactionMapper.load error: ${msg}`)
            throw err
        }
    }

    /**
     * Resuelve un número de transacción a su ruta de ejecución.
     *
     * @param tx - Código de transacción (número o string numérico)
     * @returns {TransactionRoute | null} La ruta { objectName, methodName } o null si no existe
     */
    resolve(tx: unknown): TransactionRoute | null {
        const key = typeof tx === 'number' ? tx : Number(tx)
        if (!Number.isFinite(key)) return null

        return this.txMap.get(key) || null
    }
}
