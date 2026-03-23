export const InventoryMessages = {
    es: {
        // Success
        get: 'Obtenido exitosamente',
        getAll: 'Obtenido exitosamente',
        create: 'Creado exitosamente',
        update: 'Actualizado exitosamente',
        delete: 'Cantidad reiniciada exitosamente',
        addStock: 'Stock agregado exitosamente',
        removeStock: 'Stock removido exitosamente',
        moveLocation: 'Ubicación actualizada exitosamente',

        // Common errors
        notFound: 'Inventory no encontrado',
        alreadyExists: 'Ya existe un registro con estos datos',
        invalidData: 'Datos inválidos',
        cannotDelete: 'No se puede eliminar el registro',
        permissionDenied: 'Permiso denegado',

        // Validation
        validation: {
            requiredField: 'Campo requerido',
            invalidFormat: 'Formato inválido',
            atLeastOneField: 'Debe enviar al menos un campo para actualizar',
            item: {
                min: 'El item es requerido',
                invalidType: 'El item debe ser de tipo equipo o componente',
            },
            location: {
                min: 'La ubicación es requerida',
            },
            quantity: {
                min: 'La cantidad debe ser mayor a 0',
                nonNegative: 'La cantidad no puede ser negativa',
                equipmentUnit: 'Los equipos solo permiten cantidad 0 o 1',
            },
        },
    },
    en: {
        // Success
        get: 'Retrieved successfully',
        getAll: 'Retrieved successfully',
        create: 'Created successfully',
        update: 'Updated successfully',
        delete: 'Quantity reset successfully',
        addStock: 'Stock added successfully',
        removeStock: 'Stock removed successfully',
        moveLocation: 'Location updated successfully',

        // Common errors
        notFound: 'Inventory not found',
        alreadyExists: 'Record already exists',
        invalidData: 'Invalid data',
        cannotDelete: 'Cannot delete record',
        permissionDenied: 'Permission denied',

        // Validation
        validation: {
            requiredField: 'Field required',
            invalidFormat: 'Invalid format',
            atLeastOneField: 'At least one field must be provided for update',
            item: {
                min: 'Item is required',
                invalidType: 'Item must be equipment or component type',
            },
            location: {
                min: 'Location is required',
            },
            quantity: {
                min: 'Quantity must be greater than 0',
                nonNegative: 'Quantity cannot be negative',
                equipmentUnit: 'Equipment only allows quantity 0 or 1',
            },
        },
    }
}
