export const CategoryMessages = {
    es: {
        // Success
        get: 'Obtenido exitosamente',
        getAll: 'Obtenido exitosamente',
        create: 'Creado exitosamente',
        update: 'Actualizado exitosamente',
        delete: 'Eliminado exitosamente',

        // Common errors
        notFound: 'Category no encontrado',
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
            categoryType: {
                min: 'Debe seleccionar un tipo de categoría válido',
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
        notFound: 'Category not found',
        alreadyExists: 'Record already exists',
        invalidData: 'Invalid data',
        cannotDelete: 'Cannot delete record',
        permissionDenied: 'Permission denied',

        // Validation
        validation: {
            requiredField: 'Field required',
            invalidFormat: 'Invalid format',
            description: {
                required: 'Description is required',
            },
            categoryType: {
                min: 'Must select a valid category type',
            },
        },
    }
}
