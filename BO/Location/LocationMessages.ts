export const LocationMessages = {
    es: {
        // Success
        get: 'Obtenido exitosamente',
        getAll: 'Obtenido exitosamente',
        create: 'Creado exitosamente',
        update: 'Actualizado exitosamente',
        delete: 'Eliminado exitosamente',

        // Common errors
        notFound: 'Location no encontrado',
        alreadyExists: 'Ya existe un registro con estos datos',
        invalidData: 'Datos inválidos',
        cannotDelete: 'No se puede eliminar el registro',
        permissionDenied: 'Permiso denegado',

        // Validation
        validation: {
            requiredField: 'Campo requerido',
            invalidFormat: 'Formato inválido',
            description: {
                required: 'La descripción es requerida',
            },
            shelf: {
                min: 'El estante debe ser mayor a 0',
            },
            drawer: {
                min: 'La gaveta debe ser mayor a 0',
            },
        },
    },
    en: {
        // Success
        get: 'Retrieved successfully',
        getAll: 'Retrieved successfully',
        create: 'Created successfully',
        update: 'Updated successfully',
        delete: 'Deleted successfully',

        // Common errors
        notFound: 'Location not found',
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
