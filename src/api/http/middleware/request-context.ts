import { Express, NextFunction } from 'express'
import { AppRequest, AppResponse, IContainer, IRequestContextService } from '@toproc/types'

/**
 * Abre un scope de contexto por request para acceso a sesión sin propagar req.
 */
export function applyRequestContext(app: Express, container: IContainer): void {
    if (!container.has('requestContext')) {
        return
    }

    const requestContext = container.resolve<IRequestContextService>('requestContext')

    app.use((req: AppRequest, _res: AppResponse, next: NextFunction) => {
        requestContext.run(req, () => next())
    })
}
