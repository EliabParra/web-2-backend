/**
 * Utilidades de estado global para tests.
 *
 * Provee mecanismos de bloqueo y snapshot/restore de `globalThis`
 * para aislar efectos secundarios entre suites de prueba.
 *
 * @module test/_helpers/global-state
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any

/**
 * Ejecuta `fn` dentro de un candado secuencial global.
 *
 * Garantiza que solo un test modifique `globalThis` a la vez,
 * evitando condiciones de carrera en suites paralelas.
 *
 * @param fn - Función asíncrona a ejecutar bajo el candado
 * @returns El resultado de `fn`
 */
export async function withGlobalLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev: Promise<unknown> = g.__globalTestLock ?? Promise.resolve()
    let release: () => void
    const next = new Promise<void>((resolve) => {
        release = resolve
    })
    g.__globalTestLock = prev.then(() => next)
    await prev
    try {
        return await fn()
    } finally {
        release!()
    }
}

/**
 * Captura el estado actual de claves específicas en `globalThis`.
 *
 * @param keys - Claves a capturar
 * @returns Snapshot con los valores actuales
 */
export function snapshotGlobals(keys: string[]): Record<string, unknown> {
    const snap: Record<string, unknown> = {}
    for (const k of keys) snap[k] = g[k]
    return snap
}

/**
 * Restaura claves de `globalThis` desde un snapshot previo.
 *
 * Si el valor del snapshot es `undefined`, elimina la clave.
 *
 * @param snapshot - Snapshot previamente capturado con `snapshotGlobals`
 */
export function restoreGlobals(snapshot: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(snapshot)) {
        if (v === undefined) delete g[k]
        else g[k] = v
    }
}

/**
 * Ejecuta `fn` con aislamiento automático de claves globales.
 *
 * Combina `withGlobalLock` + `snapshotGlobals` + `restoreGlobals`
 * para garantizar que las claves especificadas se restauren sin importar
 * el resultado de `fn`.
 *
 * @param keys - Claves de `globalThis` a aislar
 * @param fn - Función asíncrona a ejecutar
 * @returns El resultado de `fn`
 */
export async function withGlobals<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
    return withGlobalLock(async () => {
        const snap = snapshotGlobals(keys)
        try {
            return await fn()
        } finally {
            restoreGlobals(snap)
        }
    })
}
