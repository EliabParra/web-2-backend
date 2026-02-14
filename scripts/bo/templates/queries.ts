/**
 * Genera el archivo Queries
 */
export function templateQueries(objectName: string) {
    const cleanName = objectName.replace(/BO$/, '')
    const pascalName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
    const lowerName = cleanName.toLowerCase()

    return `export const ${pascalName}Queries = {
    findAll: \`
        SELECT * FROM ${lowerName}
    \`,
    findById: \`
        SELECT * FROM ${lowerName} WHERE id = $1
    \`,
    create: \`
        INSERT INTO ${lowerName} (created_at) VALUES (NOW()) RETURNING *
    \`,
    update: \`
        UPDATE ${lowerName} SET updated_at = NOW() WHERE id = $1 RETURNING *
    \`,
    delete: \`
        DELETE FROM ${lowerName} WHERE id = $1
    \`,
    exists: \`
        SELECT EXISTS(SELECT 1 FROM ${lowerName} WHERE id = $1) as "exists"
    \`,
} as const

export type ${pascalName}QueryKey = keyof typeof ${pascalName}Queries
`
}
