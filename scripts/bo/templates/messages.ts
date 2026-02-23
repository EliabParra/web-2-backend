/**
 * Genera el archivo Messages
 */
export function templateMessages(objectName: string, methods: string[] = []) {
    const cleanName = objectName.replace(/BO$/, '')
    const pascalName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)

    const successEs = methods.length === 0 ? '' : `        // Success
        get: 'Obtenido exitosamente',
        getAll: 'Obtenido exitosamente',
        create: 'Creado exitosamente',
        update: 'Actualizado exitosamente',
        delete: 'Eliminado exitosamente',

`

    const successEn = methods.length === 0 ? '' : `        // Success
        get: 'Retrieved successfully',
        getAll: 'Retrieved successfully',
        create: 'Created successfully',
        update: 'Updated successfully',
        delete: 'Deleted successfully',

`

    return `export const ${pascalName}Messages = {
    es: {
${successEs}        // Common errors
        notFound: '${pascalName} no encontrado',
        alreadyExists: 'Ya existe un registro con estos datos',
        invalidData: 'Datos inválidos',
        cannotDelete: 'No se puede eliminar el registro',
        permissionDenied: 'Permiso denegado',

        // Validation
        validation: {
            requiredField: 'Campo requerido',
            invalidFormat: 'Formato inválido',
        },
    },
    en: {
${successEn}        // Common errors
        notFound: '${pascalName} not found',
        alreadyExists: 'Record already exists',
        invalidData: 'Invalid data',
        cannotDelete: 'Cannot delete record',
        permissionDenied: 'Permission denied',

        // Validation
        validation: {
            requiredField: 'Field required',
            invalidFormat: 'Invalid format',
        },
    }
}
`
}
