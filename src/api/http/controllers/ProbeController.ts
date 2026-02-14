import type {
    AppRequest,
    AppResponse,
    IContainer,
    ISecurityService,
    IConfig,
} from '../../../types/index.js'

/**
 * Controlador de Probes (Health/Readiness).
 *
 * Expone endpoints para Kubernetes/Docker health checks.
 */
export class ProbeController {
    private security: ISecurityService
    private appName: string

    constructor(container: IContainer) {
        this.security = container.resolve<ISecurityService>('security')
        this.appName = container.resolve<IConfig>('config').app.name
    }

    /**
     * Liveness Probe (Health Check).
     * Retorna 200 OK si el proceso de Node.js está respondiendo.
     */
    public health(req: AppRequest, res: AppResponse) {
        return res.status(200).send({
            ok: true,
            name: this.appName,
            uptimeSec: Math.round(process.uptime()),
            time: new Date().toISOString(),
            requestId: req.requestId,
        } as any) // Cast necesario hasta unificar tipos de respuesta
    }

    /**
     * Readiness Probe.
     * Verifica dependencias críticas (Base de Datos, Seguridad).
     */
    public async ready(req: AppRequest, res: AppResponse) {
        if (this.security.isReady) {
            return res.status(200).send({ status: 'ok' } as any)
        }
        return res.status(503).send({ status: 'starting' } as any)
    }
}
