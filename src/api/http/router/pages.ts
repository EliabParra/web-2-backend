import express, { NextFunction } from 'express'
import path from 'path'
import { routes, pagesPath } from './routes.js'
import { createAuthCheckMiddleware } from '../middleware/auth-check.js'
import { PageController } from '../controllers/PageController.js'
import type {
    IContainer,
    IConfig,
    ILogger,
    II18nService,
    ISessionService,
    AppRequest,
    AppResponse,
} from '../../../types/index.js'

/** Route definition type */
interface PageRoute {
    path: string
    view: string
    validateIsAuth?: boolean
}

type PagesRouterArgs = {
    container: IContainer
    session?: Pick<ISessionService, 'sessionExists'>
    routes?: PageRoute[]
}

/**
 * Construye el router de páginas (SSR/Static).
 * Mapea definiciones de rutas a archivos HTML y aplica protección de sesión si es necesario.
 *
 * @param args - Configuración ({ container, session, routes })
 * @returns Express Router
 */
export function buildPagesRouter({ container, session, routes: providedRoutes }: PagesRouterArgs) {
    const activeRoutes = providedRoutes || routes
    const router = express.Router()
    const pageController = new PageController(container)

    const requireAuth = session
        ? createAuthCheckMiddleware(session)
        : (_req: AppRequest, res: AppResponse, _next: NextFunction) => res.redirect('/')

    activeRoutes.forEach((r: PageRoute) => {
        const handler = pageController.serve(r.view)
        if (r.validateIsAuth) router.get(r.path, requireAuth, handler)
        else router.get(r.path, handler)
    })

    return router
}

export { pagesPath }
