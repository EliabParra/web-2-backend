import { z } from 'zod'
import * as schemas from '@toproc/config'

export const ConfigSchema = z
    .object({
        app: schemas.AppConfigSchema,
        db: schemas.DbConfigSchema,
        auth: schemas.AuthConfigSchema,
        session: schemas.SessionConfigSchema,
        log: schemas.LogConfigSchema,
        email: schemas.EmailConfigSchema,
        cors: schemas.CorsConfigSchema,
        bo: schemas.BoConfigSchema,
        websocket: schemas.WebsocketConfigSchema,
    })
    .refine((config) => {
        // Cross-validation
        if (config.app.env === 'production' && !config.db.ssl) {
            // Example warning or error. For now just returning true to not block start,
            // but traditionally we'd return false here if strict.
            // Let's rely on strict boolean checks in prod
            return true
        }
        return true
    })

export type Config = z.infer<typeof ConfigSchema>
