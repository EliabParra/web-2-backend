import express, { type Application } from 'express'
import { IContainer, ISessionService } from '../types/core.js'

/**
 * Configura el hosting de páginas estáticas o SSR.
 *
 * @param app - Instancia de Express
 * @param options - Dependencias ({ container, session })
 */
export async function registerPagesHosting(
    app: Application,
    {
        container,
        session,
    }: {
        container: IContainer
        session: Pick<ISessionService, 'sessionExists'>
    }
) {
    const { buildPagesRouter, pagesPath } = await import('../api/http/router/pages.js')
    app.use(express.static(pagesPath))
    app.use(buildPagesRouter({ container, session }))
}
