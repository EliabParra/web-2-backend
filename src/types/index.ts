/**
 * Barrel file para tipos del framework.
 *
 * Re-exporta todos los tipos desde un punto de entrada único.
 *
 * @module types
 */

// Tipos de API y respuestas
export type {
    LocalizedMessage,
    LocalizedMessages,
    ApiResponse,
    ApiSuccess,
    ApiError,
    ValidationError,
    ValidationSuccess,
    ValidationFailure,
    ValidationResult,
} from './api.js'

// Tipos HTTP y Express
export type {
    AppRequest,
    AppResponse,
    LoginRequestBody,
    ToProccessRequestBody,
    SessionUser,
    WithRequest,
} from './http.js'

// Tipos de configuración
export type {
    AppConfig,
    DbConfig,
    SessionConfig,
    CorsConfig,
    LogConfig,
    AuthConfig,
    EmailConfig,
    BoConfig,
    WebsocketConfig,
    IAppConfig,
} from './config.js'

// Interfaces de servicios core
export type {
    ILogger,
    IValidator,
    II18nService,
    IDatabase,
    IConfig,
    ISecurityService,
    ISessionService,
    IEmailService,
    IContainer,
    IAuditService,
    IWebSocketService,
    SessionResult,
    TxKey,
    AppMessages,
    ITransactionMapper,
    ITransactionExecutor,
    TransactionRoute,
    IPermissionProvider,
    IMenuProvider,
    ISecurityContext,
} from './core.js'

// Tipos Excel
export type {
    ImportResult,
    ImportError,
    SheetSummary,
    IPermissionMatrixWriter,
    IPermissionMatrixReader,
    ProfileRow,
    UserRow,
    SubsystemRow,
    ObjectRow,
    MethodRow,
    MenuRow,
    OptionRow,
    PermissionRow,
    AssignmentRow,
} from './excel.js'

export {
    ProfileRowSchema,
    UserRowSchema,
    SubsystemRowSchema,
    ObjectRowSchema,
    MethodRowSchema,
    MenuRowSchema,
    OptionRowSchema,
    PermissionRowSchema,
    AssignmentRowSchema,
    ObjectMethodSchema,
    SHEET_DEFINITIONS,
} from './excel.js'
