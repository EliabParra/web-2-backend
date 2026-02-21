import type { Application } from 'express'
import type { IContainer, IConfig, ISessionService } from '../types/index.js'

function getFrontendMode(config: IConfig) {
    const raw = String(config.app.frontendMode).trim().toLowerCase()
    if (raw === 'pages' || raw === 'spa' || raw === 'none') return raw
    return 'pages'
}

type RegisterFrontendHostingArgs = {
    container: IContainer
    session: Pick<ISessionService, 'sessionExists'>
    stage: 'preApi' | 'postApi'
}

/**
 * Registra adaptadores de frontend opcionales.
 *
 * IMPORTANTE: el orden importa.
 * - pages mode debe ser registrado en el "preApi" stage (para que pueda tener sus propias rutas)
 * - spa mode debe ser registrado en el "postApi" stage (para que las rutas de API no sean sombreadas por el fallback SPA)
 */
export async function registerFrontendHosting(
    app: Application,
    { container, session, stage }: RegisterFrontendHostingArgs
) {
    const config = container.resolve<IConfig>('config')
    const mode = getFrontendMode(config)

    if (mode === 'none') return

    if (stage === 'preApi' && mode === 'pages') {
        const { registerPagesHosting } = await import('./pages.adapter.js')
        await registerPagesHosting(app, { container, session })
        return
    }

    if (stage === 'postApi' && mode === 'spa') {
        const { registerSpaHosting } = await import('./spa.adapter.js')
        await registerSpaHosting(app, { config })
    }
}
