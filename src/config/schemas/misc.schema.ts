import { z } from 'zod'

const LogLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'critical'])

export const LogConfigSchema = z.object({
    format: z.enum(['text', 'json', 'pretty']).default('text'),
    minLevel: LogLevelSchema.default('info'),
    timestamp: z.boolean().default(true),
    categories: z.record(z.string(), LogLevelSchema).optional(),
})

export type LogConfig = z.infer<typeof LogConfigSchema>

export const EmailConfigSchema = z.object({
    mode: z.enum(['smtp', 'log']).default('log'),
    smtpHost: z.string().optional(),
    smtpPort: z.number().int().optional(),
    smtpUser: z.string().optional(),
    smtpPass: z.string().optional(),
    smtpSecure: z.boolean().optional(),
    from: z.string().optional(),
})

export type EmailConfig = z.infer<typeof EmailConfigSchema>
