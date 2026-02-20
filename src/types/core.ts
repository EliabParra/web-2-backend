import { Pool } from 'pg'
import type { AppMessages } from '../locales/es.js'
import type { AppRequest, AppResponse } from './http.js'

export type { AppMessages }

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Primitivos y Types Utilitarios
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Niveles de Log estándar (RFC 5424 simplificado).
 *
 * Utilizados por `ILogger` para categorizar la severidad de los mensajes.
 */
export enum LogLevel {
    TRACE = 10,
    DEBUG = 20,
    INFO = 30,
    WARN = 40,
    ERROR = 50,
    CRITICAL = 60,
}

/**
 * Helper para obtener claves anidadas de `AppMessages`.
 * Genera un union type de strings con notación punto (e.g. `'errors.server.dbError'`).
 */
type HelperKeys<T> = T extends object
    ? {
          [K in keyof T]: K extends string
              ? T[K] extends string
                  ? K
                  : `${K}.${HelperKeys<T[K]>}`
              : never
      }[keyof T]
    : never

/**
 * Clave de traducción tipada.
 * Permite autocompletado para las claves de `AppMessages`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type TxKey = HelperKeys<AppMessages>

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Servicios Core
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interfaz para servicios de logging.
 * Estandariza la salida de logs en toda la aplicación.
 */
export interface ILogger {
    /** Registra un mensaje de nivel TRACE (detalle extremo). */
    trace(msg: string, ctx?: object): void
    /** Registra un mensaje de nivel DEBUG. */
    debug(msg: string, ctx?: object): void
    /** Registra un mensaje informativo. */
    info(msg: string, ctx?: object): void
    /** Registra una advertencia. */
    warn(msg: string, ctx?: object): void
    /** Registra un error. */
    error(msg: string, ctx?: object | Error): void
    /** Registra un error crítico (requiere intervención inmediata). */
    critical(msg: string, ctx?: object | Error): void

    /**
     * Crea un logger hijo con contexto fijo (pinned).
     * Útil para agregar categoría o request ID a todos los logs.
     *
     * @param ctx - Contexto que se anexará a cada mensaje del hijo
     */
    child(ctx: object): ILogger
}

/**
 * Interfaz para el validador de la aplicación.
 * Abstrae el motor de validación (Zod, Joi, etc.).
 */
export interface IValidator {
    /**
     * Valida datos contra un esquema.
     *
     * @template T - Tipo de datos esperado tras validación exitosa
     * @param data - Datos crudos a validar
     * @param schema - Esquema de validación
     * @returns Resultado discriminado: `{ valid: true, data }` o `{ valid: false, errors }`
     */
    validate<T>(
        data: unknown,
        schema: unknown
    ):
        | { valid: true; data: T; errors?: never }
        | { valid: false; data?: never; errors: { path: string; message: string; code?: string }[] }
}

/**
 * Interfaz para acceso a base de datos (PostgreSQL).
 * Abstrae la ejecución de queries SQL y la gestión del pool.
 */
export interface IDatabase {
    /** Pool de conexiones subyacente de `pg`. */
    pool: Pool

    /**
     * Ejecuta una consulta SQL cruda.
     *
     * @param sql - Sentencia SQL
     * @param params - Parámetros opcionales
     * @returns Resultado con filas y conteo
     */
    exeRaw(
        sql: string,
        params?: unknown
    ): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>

    /**
     * Ejecuta una consulta tipada o definición de query.
     *
     * @template T - Tipo de las filas retornadas
     * @param queryDef - String SQL directo u objeto `{ sql: string }`
     * @param params - Parámetros para consulta parametrizada ($1, $2...)
     */
    query<T extends Record<string, unknown> = Record<string, unknown>>(
        queryDef: string | { sql: string },
        params?: unknown[]
    ): Promise<{ rows: T[]; rowCount: number | null }>

    /** Cierra todas las conexiones del pool. */
    shutdown(): Promise<void>
}

/**
 * Configuración global de la aplicación.
 * Re-exportado desde `config.ts` para compatibilidad.
 */
export type { IAppConfig as IConfig } from './config.js'

// Import para uso en interfaces locales
import type { IAppConfig } from './config.js'
import { SessionUserRow } from '../services/schemas/session.js'

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Servicios de Infraestructura
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Servicio de internacionalización (i18n).
 * Gestiona traducciones, formateo de fechas/monedas e interpolación de templates.
 */
export interface II18nService {
    /** Código del idioma activo (e.g. `'es'`, `'en'`). */
    currentLocale: string
    /** Objeto completo de mensajes del idioma activo. */
    messages: AppMessages

    /**
     * Traduce una clave a texto localizado.
     * Soporta claves anidadas (e.g. `'auth.login.success'`) e interpolación.
     *
     * @param key - Clave del mensaje
     * @param params - Variables para interpolar
     * @param locale - Idioma opcional (override del actual)
     */
    translate(key: TxKey | (string & {}), params?: Record<string, unknown>, locale?: string): string

    /**
     * Formatea una fecha según el locale actual.
     *
     * @param date - Fecha a formatear
     * @param options - Opciones de `Intl.DateTimeFormat`
     */
    formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string

    /**
     * Formatea una cantidad monetaria según el locale actual.
     *
     * @param amount - Cantidad monetaria
     * @param currency - Código ISO de moneda (e.g. `'USD'`, `'EUR'`)
     */
    formatCurrency(amount: number, currency: string): string

    /**
     * Interpola parámetros en un template string.
     *
     * @param template - String con placeholders `{{key}}`
     * @param params - Variables a interpolar
     */
    format(template: string, params?: Record<string, unknown>): string

    /**
     * Selecciona el objeto de mensajes para el idioma actual.
     *
     * @template T - Tipo de los mensajes
     * @param messageSet - Objeto con mensajes por idioma
     */
    use<T>(messageSet: Record<string, T>): NonNullable<T>

    /**
     * Obtiene un objeto de error HTTP con código y mensaje.
     * Soporta selector function (Typed).
     *
     * @param selector - Función selectora
     * @param params - Variables opcionales para interpolar
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(
        selector: (msgs: AppMessages['errors']) => { msg: string; code: number },
        params?: Record<string, unknown>
    ): { msg: string; code: number }

    /**
     * Método Legacy para obtener errores por string key.
     * Mantenido para compatibilidad con código antiguo.
     * 
     * @param key - Clave string
     * @param params - Variables opcionales para interpolar
     */
    errorKey(
        key: string,
        params?: Record<string, unknown>
    ): { msg: string; code: number }

    /**
     * Obtiene el valor raw de una clave (para estructuras anidadas).
     *
     * @param key - Clave de acceso con notación punto
     * @param locale - Idioma opcional
     */
    get(key: string, locale?: string): unknown
}

/**
 * Servicio de envío de correos electrónicos.
 * Soporta modo 'smtp' (producción) y modo 'log' (desarrollo).
 */
export interface IEmailService {
    /**
     * Envía un correo electrónico simple (texto plano o HTML raw).
     *
     * @param params - Opciones de envío
     */
    send(params: {
        to: string
        subject: string
        text?: string
        html?: string
    }): Promise<{ ok: boolean; mode: string }>

    /**
     * Envía un correo usando una plantilla HTML con interpolación.
     *
     * @param params - Opciones con ruta de plantilla y datos
     */
    sendTemplate(params: {
        to: string
        subject: string
        templatePath: string
        data: Record<string, unknown>
    }): Promise<{ ok: boolean; mode: string }>

    /**
     * Enmascara un email para logs (e.g. `"el***@example.com"`).
     *
     * @param email - Email a enmascarar
     */
    maskEmail(email: string): string
}

/**
 * Servicio de auditoría.
 * Registra eventos de seguridad y negocio de manera asíncrona (Best Effort).
 */
export interface IAuditService {
    /**
     * Registra un evento de auditoría.
     *
     * @param req - Request HTTP que originó el evento
     * @param args - Detalles del evento a registrar
     */
    log(
        req: AppRequest,
        args: {
            action: string
            objectName?: string | null
            methodName?: string | null
            tx?: unknown
            user_id?: number | null
            profile_id?: number | null
            details?: Record<string, unknown>
        }
    ): Promise<void>
}

/**
 * Interfaz del servicio WebSocket.
 *
 * Define la API pública para comunicación en tiempo real.
 * Soporta arquitectura híbrida: Memoria Local (desarrollo) y Redis Pub/Sub (producción).
 * Todos los métodos de emisión son Fire & Forget (no requieren `await`).
 * El enrutamiento se delega a las Salas nativas de Socket.io.
 */
export interface IWebSocketService {
    /**
     * Inicializa el servidor WebSocket sobre un servidor HTTP existente.
     * Configura el adaptador (Memory o Redis) según la configuración activa.
     *
     * @param httpServer - Instancia del servidor HTTP de Node.js
     */
    initialize(httpServer: any): Promise<void>

    /**
     * Emite un evento a todas las conexiones de un usuario específico.
     * Usa la sala `user_{userId}` para enrutamiento nativo.
     *
     * @param userId - Identificador único del usuario
     * @param event - Nombre del evento a emitir
     * @param payload - Datos del evento
     */
    emitToUser(userId: string, event: string, payload: any): void

    /**
     * Emite un evento a todos los clientes conectados (broadcast global).
     *
     * @param event - Nombre del evento a emitir
     * @param payload - Datos del evento
     */
    broadcast(event: string, payload: any): void

    /**
     * Emite un evento a todos los miembros de una sala específica.
     *
     * @param roomName - Nombre de la sala destino
     * @param event - Nombre del evento a emitir
     * @param payload - Datos del evento
     */
    emitToRoom(roomName: string, event: string, payload: any): void

    /**
     * Agrega todas las conexiones de un usuario a una sala.
     *
     * @param userId - Identificador del usuario
     * @param roomName - Nombre de la sala a unir
     */
    addUserToRoom(userId: string, roomName: string): void

    /**
     * Remueve todas las conexiones de un usuario de una sala.
     *
     * @param userId - Identificador del usuario
     * @param roomName - Nombre de la sala a abandonar
     */
    removeUserFromRoom(userId: string, roomName: string): void

    /**
     * Retorna el conteo de conexiones activas rastreadas localmente en este nodo.
     *
     * @returns Número de usuarios con al menos una conexión activa
     */
    getLocalConnectionsCount(): number

    /**
     * Cierra el servidor WebSocket y libera recursos.
     * Desconecta clientes y cierra conexiones Redis si aplica.
     */
    shutdown(): Promise<void>
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Seguridad
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Servicio de seguridad y orquestación de transacciones.
 * Gestiona permisos, resolución de transacciones y ejecución de BOs.
 */
export interface ISecurityService {
    /** Indica si el sistema de seguridad ha cargado correctamente. */
    isReady: boolean
    /** Promesa que resuelve cuando la inicialización completa. */
    ready: Promise<boolean>

    /**
     * Inicializa los subsistemas de seguridad (Mapper, Guard, MenuProvider).
     * Carga permisos y mapeos desde la base de datos.
     *
     * @returns `true` si la inicialización fue exitosa
     */
    init(): Promise<boolean>

    /**
     * Resuelve un código de transacción a su ruta de ejecución (BO/Método).
     *
     * @param tx - Código de transacción
     * @returns Ruta `{ objectName, methodName }` o `false` si no existe
     */
    getDataTx(tx: unknown): { objectName: string; methodName: string } | false

    /**
     * Verifica si un perfil tiene permisos para ejecutar un método.
     *
     * @param data - Datos de verificación
     */
    getPermissions(data: { profileId: number; methodName: string; objectName: string }): boolean

    /**
     * Ejecuta un método de negocio.
     *
     * @param data - Datos de ejecución
     */
    executeMethod(data: {
        objectName: string
        methodName: string
        params: Record<string, unknown>
    }): Promise<{ code: number; msg: string; [key: string]: unknown }>

    /**
     * Otorga un permiso dinámicamente (Dual Write: DB + memoria).
     *
     * @param profileId - ID del perfil
     * @param objectName - Nombre del objeto
     * @param methodName - Nombre del método
     */
    grantPermission(profileId: number, objectName: string, methodName: string): Promise<boolean>

    /**
     * Revoca un permiso dinámicamente (Dual Write: DB + memoria).
     *
     * @param profileId - ID del perfil
     * @param objectName - Nombre del objeto
     * @param methodName - Nombre del método
     */
    revokePermission(profileId: number, objectName: string, methodName: string): Promise<boolean>
}

/**
 * Contexto de Seguridad Inmutable.
 * Transporta la identidad del usuario a través del ciclo de una transacción.
 */
export interface ISecurityContext {
    readonly userId: number | null
    readonly profileId: number | null
    readonly username: string
}

/**
 * Proveedor de verificación de permisos.
 * Implementado por `PermissionGuard` para verificaciones O(1) en memoria.
 */
export interface IPermissionProvider {
    /**
     * Carga la matriz de permisos desde la fuente de datos.
     */
    load(): Promise<void>

    /**
     * Verifica si un perfil tiene acceso a un método de un objeto.
     *
     * @param profileId - ID del perfil
     * @param objectName - Nombre del objeto
     * @param methodName - Nombre del método
     */
    check(profileId: number | null, objectName: string, methodName: string): boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Container + Transaction
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contenedor de Inyección de Dependencias (IoC Container).
 *
 * Contrato para el contenedor que gestiona el ciclo de vida de las dependencias.
 * Todos los componentes que requieran dependencias reciben `IContainer`.
 */
export interface IContainer {
    /**
     * Registra una instancia ya construida.
     *
     * @template T - Tipo del servicio
     * @param key - Clave única de identificación
     * @param instance - Instancia del servicio
     */
    register<T>(key: string, instance: T): void

    /**
     * Registra una factory para inicialización lazy.
     * La factory se ejecuta en el primer `resolve()` y el resultado se cachea.
     *
     * @template T - Tipo del servicio que produce la factory
     * @param key - Clave única de identificación
     * @param factory - Función que recibe el contenedor y retorna la instancia
     */
    registerFactory<T>(key: string, factory: (container: IContainer) => T): void

    /**
     * Resuelve una dependencia por su clave.
     *
     * @template T - Tipo esperado del servicio
     * @param key - Clave de la dependencia a resolver
     * @returns Instancia del servicio
     * @throws {Error} Si la clave no está registrada
     */
    resolve<T>(key: string): T

    /**
     * Verifica si una clave está registrada (como instancia o factory).
     *
     * @param key - Clave a verificar
     */
    has(key: string): boolean
}

/**
 * Ruta de ejecución de una transacción.
 * Mapea un código TX a un par `objectName` / `methodName`.
 */
export type TransactionRoute = {
    objectName: string
    methodName: string
}

/**
 * Mapeador de transacciones.
 * Traduce códigos de transacción numéricos a rutas de ejecución.
 */
export interface ITransactionMapper {
    /** Carga el mapa de transacciones desde la base de datos. */
    load(): Promise<void>
    /**
     * Resuelve un código de transacción a su ruta.
     *
     * @param tx - Código de transacción
     * @returns Ruta o `null` si no existe
     */
    resolve(tx: unknown): TransactionRoute | null
}

/**
 * Ejecutor de transacciones.
 * Carga e invoca dinámicamente Business Objects basado en rutas resueltas.
 */
export interface ITransactionExecutor {
    /**
     * Ejecuta un método de un Business Object.
     *
     * @param objectName - Nombre del BO (e.g. `'Auth'`)
     * @param methodName - Nombre del método (e.g. `'login'`)
     * @param params - Parámetros de entrada
     */
    execute(
        objectName: string,
        methodName: string,
        params: Record<string, unknown> | null | undefined
    ): Promise<unknown>
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Resultados y Sesión
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resultado de inicio de sesión.
 * Tipo discriminado por `status`: `'success'`, `'error'`, o `'validation_error'`.
 */
export type SessionResult =
    | {
          status: 'success'
          user: { user_id: number; username: string; user_email: string; profile_id: number }
          msg: { code: number; msg: string }
      }
    | { status: 'error'; error: { code: number; msg: string } }
    | {
          status: 'validation_error'
          error: { code: number; msg: string }
          errors: { path: string; message: string }[]
          alerts: unknown
      }

/**
 * Servicio de gestión de sesiones de usuario.
 */
export interface ISessionService {
    /**
     * Verifica si una sesión de usuario está actualmente activa.
     *
     * @param req - Request de Express
     */
    sessionExists(req: AppRequest): boolean

    /**
     * Establece una nueva sesión.
     *
     * @param req - Request con credenciales en el body
     */
    createSession(req: AppRequest, user: SessionUserRow): Promise<SessionResult>

    /**
     * Destruye la sesión actual del usuario (Logout).
     *
     * @param req - Request con la sesión a destruir
     */
    destroySession(req: AppRequest): void

    /**
     * Establece datos en la sesión actual.
     *
     * @param req - Request con la sesión
     * @param data - Datos a establecer
     */
    setDataSession(req: AppRequest, data: any): void

    /**
     * Obtiene los datos de la sesión actual.
     *
     * @param req - Request con la sesión
     */
    getDataSession(req: AppRequest): any

    /**
     * Autentica a un usuario.
     *
     * @param req - Request con credenciales en el body
     */
    authenticate(req: AppRequest): Promise<SessionResult>
    }

    

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Legacy (Deprecated — se eliminará en fases posteriores)
// ═══════════════════════════════════════════════════════════════════════════════
