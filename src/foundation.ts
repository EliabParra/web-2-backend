// Bootstrap: Inicialización de servicios core.
// 100% Dependency Injection - Container como única fuente de verdad
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { container } from './core/Container.js'
import { ConfigLoader } from './config/index.js'
import { I18nService } from './services/I18nService.js'
import { FeatureFlags } from './config/FeatureFlags.js'
import { ValidatorService } from './services/ValidatorService.js'
import { AppLogger } from './services/LoggerService.js'
import { SecurityService } from './services/SecurityService.js'
import { SessionManager } from './services/SessionService.js'
import { EmailService } from './services/EmailService.js'
import { AppServer } from './api/AppServer.js'
import { AuditService } from './services/AuditService.js'
import { DatabaseService } from './services/DatabaseService.js'
import { WebSocketService } from './services/WebSocketService.js'
import { es } from './locales/es.js'
import { en } from './locales/en.js'

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
const i18n = new I18nService(config.app.lang)
i18n.register('es', es)
i18n.register('en', en)
container.register('i18n', i18n)

// 3. Feature Flags (síncrono, solo config)
container.register('features', new FeatureFlags(config))

// 4. Validador (síncrono, solo i18n)
container.register('validator', new ValidatorService(i18n))

// 5. Logger (síncrono, solo config)
container.register('log', new AppLogger({ config }))

// 6. Factories para servicios con múltiples dependencias (lazy)
container.registerFactory('db', (c) => new DatabaseService(c))
container.registerFactory('audit', (c) => new AuditService(c))
container.registerFactory('email', (c) => new EmailService(c))
container.registerFactory('session', (c) => new SessionManager(c))
container.registerFactory('security', (c) => new SecurityService(c))
container.registerFactory('websocket', (c) => new WebSocketService(c))
container.registerFactory('appServer', (c) => new AppServer(c))

// Exportar solo el container — fuente única de verdad
export { container }
