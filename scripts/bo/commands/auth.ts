import { Context } from '../core/ctx.js'
import { Interactor } from '../interactor/ui.js'
import { AuthPreset } from '../templates/auth-preset.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import colors from 'colors'

interface AuthOptions {
    isDryRun?: boolean
}

const AUTH_FEATURES = [
    { key: 'register', label: '📝 User Registration', enabled: true },
    { key: 'email-verify', label: '✉️ Email Verification', enabled: true },
    { key: 'password-reset', label: '🔑 Password Reset', enabled: true },
    { key: 'social', label: '🌐 Social Login (OAuth)', enabled: false, comingSoon: true },
]

/**
 * Comando Auth - genera el módulo de autenticación con nomenclatura Name.Type.ts
 *
 * Estructura generada:
 * - AuthBO.ts (archivo principal)
 * - AuthService.ts
 * - AuthRepository.ts
 * - AuthSchemas.ts
 * - AuthTypes.ts
 * - AuthMessages.ts
 * - AuthErrors.ts
 * - AuthQueries.ts
 * - AuthModule.ts
 * - AuthSocialAuth.ts (placeholder)
 */
export class AuthCommand {
    private interactor: Interactor

    constructor(private ctx: Context) {
        this.interactor = new Interactor()
    }

    async run(opts: AuthOptions = {}) {
        this.interactor.divider()
        this.interactor.info('🔑 Auth Preset Generator')

        // Check if Auth already exists
        const authDir = path.join(this.ctx.config.rootDir, 'BO', 'Auth')
        let exists = false
        try {
            await fs.access(authDir)
            exists = true
        } catch {}

        if (exists && !opts.isDryRun) {
            this.interactor.warn('Auth module already exists at BO/Auth/')
            const overwrite = await this.interactor.confirm('Overwrite existing files?', false)
            if (!overwrite) {
                this.interactor.info('Cancelled.')
                return
            }
        }

        // Show available features
        this.interactor.info('Available Auth Features:')

        const featureRows = AUTH_FEATURES.map(f => [
             f.comingSoon ? '🔜' : '✅',
             f.label,
             f.comingSoon ? colors.yellow('Coming Soon') : colors.green('Enabled')
        ])
        
        this.interactor.table(['Status', 'Feature', 'Detail'], featureRows)

        // Confirm generation
        if (!opts.isDryRun) {
            const proceed = await this.interactor.confirm('Generate Auth module?', true)
            if (!proceed) {
                this.interactor.info('Cancelled.')
                return
            }
        }

        if (opts.isDryRun) {
            this.interactor.info('Dry run - would create:')
            
            const dryFiles = [
                ['📦', 'AuthBO.ts', 'Main Entry Point'],
                ['🧠', 'AuthService.ts', 'Business Logic'],
                ['🗄️', 'AuthRepository.ts', 'Data Access'],
                ['✅', 'AuthSchemas.ts', 'Validation'],
                ['📘', 'AuthTypes.ts', 'TypeScript Interfaces'],
                ['🌎', 'AuthMessages.ts', 'Messages for i18n'],
                ['❌', 'AuthErrors.ts', 'Domain Errors'],
                ['🔍', 'AuthQueries.ts', 'SQL Queries'],
                ['📦', 'AuthModule.ts', 'Module Barrel'],
                ['🔜', 'AuthSocialAuth.ts', 'Coming Soon']
            ]
            this.interactor.table(['Icon', 'File (BO/Auth/)', 'Description'], dryFiles)
            return
        }

        // Create directories
        await fs.mkdir(authDir, { recursive: true })
        this.interactor.startSpinner('Generating Auth module...')

        // Generate files with new naming convention
        const files = [
            {
                path: path.join(authDir, 'AuthBO.ts'),
                content: AuthPreset.bo(),
                icon: '📦',
            },
            {
                path: path.join(authDir, 'AuthService.ts'),
                content: AuthPreset.service(),
                icon: '🧠',
            },
            {
                path: path.join(authDir, 'AuthRepository.ts'),
                content: AuthPreset.repository(),
                icon: '🗄️',
                desc: 'Auth Repository',
            },
            {
                path: path.join(authDir, 'AuthSchemas.ts'),
                content: AuthPreset.schemas(),
                icon: '✅',
            },
            { path: path.join(authDir, 'AuthTypes.ts'), content: AuthPreset.types(), icon: '📘' },
            {
                path: path.join(authDir, 'AuthMessages.ts'),
                content: AuthPreset.messages(),
                icon: '🌎',
            },
            {
                path: path.join(authDir, 'AuthErrors.ts'),
                content: AuthPreset.errors(),
                icon: '❌',
            },
            {
                path: path.join(authDir, 'AuthQueries.ts'),
                content: AuthPreset.queries(),
                icon: '🔍',
                desc: 'SQL Queries',
            },
            {
                path: path.join(authDir, 'AuthModule.ts'),
                content: AuthPreset.module(),
                icon: '📦',
                desc: 'Module Barrel',
            },
        ]

        for (const f of files) {
            await fs.writeFile(f.path, f.content)
        }

        // Create Social Auth placeholder
        const socialAuthPath = path.join(authDir, 'AuthSocialAuth.ts')
        await fs.writeFile(socialAuthPath, this.generateSocialAuthPlaceholder())
        
        this.interactor.stopSpinner(true)
        this.interactor.success('Auth module created with 9 files!')

        this.interactor.table(['File', 'Status'], [
             ...files.map(f => [`${f.icon} ${path.basename(f.path)}`, colors.green('Created')]),
             ['🔜 AuthSocialAuth.ts', colors.yellow('Coming Soon')]
        ])

        console.log('')
        console.log(colors.cyan('💡 Next steps:'))
        console.log(`   1. Edit ${colors.bold('AuthTypes.ts')} to define user interfaces`)
        console.log(`   2. Edit ${colors.bold('AuthSchemas.ts')} to add validation rules`)
        console.log(`   3. Configure auth in ${colors.bold('config.json')}:`)
        console.log(colors.gray('      "auth": {'))
        console.log(colors.gray('        "loginId": "email",'))
        console.log(colors.gray('        "requireEmailVerification": true,'))
        console.log(colors.gray('        "sessionProfileId": 3'))
        console.log(colors.gray('      }'))
        console.log('')
        console.log(`   4. Register methods: ${colors.bold('pnpm run bo sync Auth')}`)
        console.log(`   5. Assign permissions: ${colors.bold('pnpm run bo perms Auth')}`)
        console.log('')
    }

    private generateSocialAuthPlaceholder(): string {
        return `/**
 * Social Authentication (OAuth) - Coming Soon
 *
 * Este módulo proveerá integración OAuth para:
 * - Google Sign-In
 * - GitHub OAuth
 * - Microsoft Account
 * - Apple Sign-In
 *
 * Estado: 🔜 Próximamente
 */

import { AuthMessages } from './AuthMessages.js'
import { AuthError } from './AuthErrors.js'

// ============================================================
// PLACEHOLDER - NO USAR EN PRODUCCIÓN
// ============================================================

export interface OAuthProvider {
    name: string
    clientId: string
    clientSecret: string
    redirectUri: string
    scopes: string[]
}

export interface OAuthConfig {
    google?: OAuthProvider
    github?: OAuthProvider
    microsoft?: OAuthProvider
    apple?: OAuthProvider
}

export interface OAuthUser {
    providerId: string
    providerUserId: string
    email: string
    name?: string
    picture?: string
}

/**
 * 🔜 Próximamente: Social Authentication Service
 *
 * Métodos planeados:
 * - getAuthorizationUrl(provider: string): string
 * - handleCallback(provider: string, code: string): Promise<OAuthUser>
 * - linkAccount(userId: number, oauthUser: OAuthUser): Promise<void>
 * - unlinkAccount(userId: number, provider: string): Promise<void>
 */
export class SocialAuthService {
    constructor(_config: OAuthConfig) {
        console.warn('⚠️ SocialAuthService aún no implementado')
    }

    async getAuthorizationUrl(_provider: string): Promise<string> {
        throw new AuthError('🔜 Social login próximamente!', 'SOCIAL_NOT_IMPLEMENTED', 501)
    }

    async handleCallback(_provider: string, _code: string): Promise<OAuthUser> {
        throw new AuthError('🔜 Social login próximamente!', 'SOCIAL_NOT_IMPLEMENTED', 501)
    }

    async linkAccount(_userId: number, _oauthUser: OAuthUser): Promise<void> {
        throw new AuthError('🔜 Social login próximamente!', 'SOCIAL_NOT_IMPLEMENTED', 501)
    }

    async unlinkAccount(_userId: number, _provider: string): Promise<void> {
        throw new AuthError('🔜 Social login próximamente!', 'SOCIAL_NOT_IMPLEMENTED', 501)
    }
}

/**
 * 🔜 Próximamente: Métodos de Social Auth para AuthBO
 */
export const SOCIAL_AUTH_METHODS = [
    'socialLoginStart',
    'socialLoginCallback',
    'linkSocialAccount',
    'unlinkSocialAccount',
]
`
    }
}
