import { Router, Request, Response, NextFunction } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

export const explorerRouter = Router()

explorerRouter.use(protectExplorer)

explorerRouter.get('/spec', (_req: Request, res: Response) => {
    if (!fs.existsSync(SPEC_PATH)) {
        res.status(404).json({
            code: 404,
            msg: 'spec.json no encontrado. Ejecuta: pnpm run explorer',
        })
        return
    }

    const spec = fs.readFileSync(SPEC_PATH, 'utf-8')
    res.setHeader('Content-Type', 'application/json')
    res.send(spec)
})

explorerRouter.get('/', (_req: Request, res: Response) => {
    if (!fs.existsSync(HTML_PATH)) {
        res.status(404).json({ code: 404, msg: 'index.html del Explorer no encontrado.' })
        return
    }

    res.sendFile(HTML_PATH)
})
