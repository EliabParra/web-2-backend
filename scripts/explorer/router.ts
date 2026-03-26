import { Router, Request, Response, NextFunction } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateExplorerSpec } from './generate.js'
import type { IContainer, IDatabase, ILogger, AppRequest, AppResponse } from '@toproc/types'
import type { TransactionController } from '@toproc/controllers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPEC_PATH = path.resolve(__dirname, 'spec.json')
const HTML_PATH = path.resolve(__dirname, 'index.html')

const EXPLORER_KEY = 'toproc123'

function protectExplorer(req: Request, res: Response, next: NextFunction): void {
    const queryKey = req.query.key as string | undefined
    const headerKey = req.headers['x-explorer-key'] as string | undefined

    if (queryKey === EXPLORER_KEY || headerKey === EXPLORER_KEY) {
        next()
        return
    }

    res.status(403).json({ code: 403, msg: 'Forbidden — Explorer key inválida o ausente.' })
}

export function createExplorerRouter(
    container: IContainer,
    txController: TransactionController,
): Router {
    const router = Router()
    const db = container.resolve<IDatabase>('db')
    const log = container.resolve<ILogger>('log').child({ category: 'Explorer' })

    router.use(protectExplorer)

    router.get('/spec', async (req: Request, res: Response) => {
        const forceRefresh = req.query.refresh === '1'

        if (forceRefresh || !fs.existsSync(SPEC_PATH)) {
            try {
                await generateExplorerSpec({ includeDbTxSync: true })
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error)
                res.status(500).json({
                    code: 500,
                    msg: `No se pudo generar spec.json: ${message}`,
                })
                return
            }
        }

        const spec = fs.readFileSync(SPEC_PATH, 'utf-8')
        res.setHeader('Content-Type', 'application/json')
        res.send(spec)
    })

    router.get('/', (_req: Request, res: Response) => {
        if (!fs.existsSync(HTML_PATH)) {
            res.status(404).json({ code: 404, msg: 'index.html del Explorer no encontrado.' })
            return
        }

        res.sendFile(HTML_PATH)
    })

    // ── TX Bypass (solo en desarrollo) ──────────────────────────────────
    // Permite ejecutar transacciones sin sesión ni CSRF.
    // Ya está protegido por protectExplorer (key obligatoria).
    router.post('/exec', async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await db.query<{
                user_id: number
                user_na: string
                user_em: string
                profile_ids: number[]
            }>(`
                SELECT u.user_id, u.user_na, u.user_em,
                    COALESCE(array_agg(up.profile_id) FILTER (WHERE up.profile_id IS NOT NULL), '{}') as profile_ids
                FROM security."user" u
                LEFT JOIN security.user_profile up ON u.user_id = up.user_id
                WHERE u.user_act = true
                GROUP BY u.user_id, u.user_na, u.user_em
                ORDER BY cardinality(array_agg(up.profile_id) FILTER (WHERE up.profile_id IS NOT NULL)) DESC
                LIMIT 1
            `, [])

            const adminUser = result.rows[0]
            if (!adminUser) {
                res.status(503).json({ code: 503, msg: 'No hay usuarios activos en la BD.' })
                return
            }

            const profileIds = Array.isArray(adminUser.profile_ids)
                ? adminUser.profile_ids.map(Number).filter(id => Number.isInteger(id) && id > 0)
                : []

            ;(req as unknown as AppRequest).session = {
                ...(req as any).session,
                userId: adminUser.user_id,
                username: adminUser.user_na,
                email: adminUser.user_em,
                profileIds,
                activeProfileId: profileIds[0] ?? null,
            }

            log.warn(`[BYPASS] TX como user_id=${adminUser.user_id} (${adminUser.user_na})`)
        } catch (err) {
            next(err)
            return
        }

        return txController.handle(req as AppRequest, res as AppResponse, next)
    })

    return router
}
