import { AsyncLocalStorage } from 'node:async_hooks'
import type { AppRequest, AppSessionData, IRequestContextService } from '@toproc/types'

type RequestStore = {
    req: AppRequest
}

/**
 * Contexto por request usando AsyncLocalStorage.
 * Permite acceder a la sesión actual sin propagar req por toda la aplicación.
 */
export class RequestContextService implements IRequestContextService {
    private readonly context = new AsyncLocalStorage<RequestStore>()

    run<T>(req: AppRequest, fn: () => T): T {
        return this.context.run({ req }, fn)
    }

    hasRequest(): boolean {
        return !!this.context.getStore()?.req
    }

    getRequest(): AppRequest {
        const req = this.context.getStore()?.req
        if (!req) {
            throw new Error('Request context no está disponible')
        }
        return req
    }

    hasSession(): boolean {
        const req = this.context.getStore()?.req
        return !!req?.session
    }

    getSession<T extends AppSessionData = AppSessionData>(): T {
        const req = this.getRequest()
        if (!req.session) {
            throw new Error('Session no está disponible en la solicitud actual')
        }
        return req.session as unknown as T
    }

    setSession(patch: Partial<AppSessionData>): void {
        if (!patch || typeof patch !== 'object') {
            return
        }
        const req = this.getRequest()
        if (!req.session) {
            throw new Error('Session no está disponible en la solicitud actual')
        }
        Object.assign(req.session, patch)
    }
}
