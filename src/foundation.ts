// Bootstrap: Inicialización de servicios core.
// 100% Dependency Injection - Container como única fuente de verdad
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { container } from '@toproc/core/Container.js'

import { AppServer } from '@toproc/api/AppServer.js'
import * as services from '@toproc/services'

import { ConfigLoader, FeatureFlags } from '@toproc/config'

import { es, en } from '@toproc/locales'

// Controllers
import * as controllers from '@toproc/controllers'

// Core Security & Transactions
import * as security from '@toproc/security'
import * as transaction from '@toproc/transaction'

/**
 * Resuelve rutas relativas al directorio raíz del repositorio.
 *
 * @param parts - Segmentos de ruta a resolver
 * @returns Ruta absoluta resuelta desde la raíz del proyecto
 */
function repoPath(...parts: string[]): string {
    const srcDir = path.dirname(fileURLToPath(import.meta.url))
    const repoRoot = path.resolve(srcDir, '..')
    return path.resolve(repoRoot, ...parts)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Registro de servicios en el contenedor IoC
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Configuración (síncrono, sin deps)
const config = ConfigLoader.load(repoPath('.'))
container.register('config', config)

// 2. I18n (síncrono, sin deps)
const i18n = new services.I18nService(config.app.lang)
i18n.register('es', es)
i18n.register('en', en)
container.register('i18n', i18n)

// 3. Feature Flags (síncrono, solo config)
container.register('features', new FeatureFlags(config))

// 4. Validador (síncrono, solo i18n)
container.register('validator', new services.ValidatorService(i18n))

// 5. Logger (síncrono, solo config)
container.register('log', new services.LoggerService({ config }))

// 6. Factories para servicios con múltiples dependencias (lazy)
container.registerFactory('db', (c) => new services.DatabaseService(c))
container.registerFactory('audit', (c) => new services.AuditService(c))
container.registerFactory('email', (c) => new services.EmailService(c))
container.registerFactory('requestContext', () => new services.RequestContextService())
container.registerFactory('session', (c) => new services.SessionManager(c))
container.registerFactory('security', (c) => new services.SecurityService(c))
container.registerFactory('websocket', (c) => new services.WebSocketService(c))

// 7. Core Security & Transactions
container.registerFactory('transactionMapper', (c) => new transaction.TransactionMapper(c))
container.registerFactory('transactionExecutor', (c) => new transaction.TransactionExecutor(c))
container.registerFactory('orchestrator', (c) => new transaction.TransactionOrchestrator(c))
container.registerFactory('permissionGuard', (c) => new security.PermissionGuard(c))
container.registerFactory('authorization', (c) => new security.AuthorizationService(c))
container.registerFactory('menuProvider', (c) => new security.MenuProvider(c))

// 8. API Controllers
container.registerFactory('authController', (c) => new controllers.AuthController(c))
container.registerFactory('txController', (c) => new controllers.TransactionController(c))
container.registerFactory('probeController', (c) => new controllers.ProbeController(c))

// 9. App Server
container.registerFactory('appServer', (c) => new AppServer(c))

// Exportar solo el container — fuente única de verdad
export { container }
