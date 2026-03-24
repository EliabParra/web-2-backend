const CARACAS_TIME_ZONE = 'America/Caracas'
const DDMMYYYY = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
const YYYYMMDD = /^(\d{4})-(\d{2})-(\d{2})$/

function parseInteger(value: string): number {
    return Number.parseInt(value, 10)
}

function safeDateFromMs(ms: number): Date | null {
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
}

function buildUtcFromCaracasParts(
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
    second = 0
): Date | null {
    // Caracas is fixed UTC-4, so local time +4h gives UTC.
    return safeDateFromMs(Date.UTC(year, month - 1, day, hour + 4, minute, second, 0))
}

export function parseDateInput(value: unknown): Date | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value
    }

    if (typeof value !== 'string') return null

    const raw = value.trim()
    if (!raw) return null

    const ddmmyyyy = DDMMYYYY.exec(raw)
    if (ddmmyyyy) {
        const day = parseInteger(ddmmyyyy[1])
        const month = parseInteger(ddmmyyyy[2])
        const year = parseInteger(ddmmyyyy[3])
        const hour = ddmmyyyy[4] ? parseInteger(ddmmyyyy[4]) : 0
        const minute = ddmmyyyy[5] ? parseInteger(ddmmyyyy[5]) : 0
        const second = ddmmyyyy[6] ? parseInteger(ddmmyyyy[6]) : 0
        return buildUtcFromCaracasParts(year, month, day, hour, minute, second)
    }

    const yyyymmdd = YYYYMMDD.exec(raw)
    if (yyyymmdd) {
        const year = parseInteger(yyyymmdd[1])
        const month = parseInteger(yyyymmdd[2])
        const day = parseInteger(yyyymmdd[3])
        return buildUtcFromCaracasParts(year, month, day)
    }

    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getCaracasYmd(date: Date): { year: string; month: string; day: string } {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: CARACAS_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date)

    const year = parts.find((part) => part.type === 'year')?.value ?? ''
    const month = parts.find((part) => part.type === 'month')?.value ?? ''
    const day = parts.find((part) => part.type === 'day')?.value ?? ''
    return { year, month, day }
}

export function normalizeDateOnlyInput(value: unknown): string | null {
    const parsed = parseDateInput(value)
    if (!parsed) return null
    const { year, month, day } = getCaracasYmd(parsed)
    if (!year || !month || !day) return null
    return `${year}-${month}-${day}`
}

export function normalizeDateTimeInput(value: unknown): string | null {
    const parsed = parseDateInput(value)
    if (!parsed) return null
    return parsed.toISOString()
}

export function formatCaracasDate(value: unknown, locale = 'es-VE'): string | null {
    const parsed = parseDateInput(value)
    if (!parsed) return null
    return new Intl.DateTimeFormat(locale, {
        timeZone: CARACAS_TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed)
}

export function formatCaracasDateTime(value: unknown, locale = 'es-VE'): string | null {
    const parsed = parseDateInput(value)
    if (!parsed) return null
    return new Intl.DateTimeFormat(locale, {
        timeZone: CARACAS_TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(parsed)
}

export { CARACAS_TIME_ZONE }
