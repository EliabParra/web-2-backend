export const LoanMessages = {
    es: {
        // Success
        getRequest: 'Solicitud obtenida exitosamente',
        getAllRequests: 'Solicitudes obtenidas exitosamente',
        requestLoan: 'Solicitud de préstamo creada exitosamente',
        acceptRequestLoan: 'Solicitud aprobada exitosamente',
        rejectRequestLoan: 'Solicitud rechazada exitosamente',
        getLoan: 'Préstamo obtenido exitosamente',
        getAllLoans: 'Préstamos obtenidos exitosamente',
        registerLoan: 'Préstamo registrado exitosamente',

        // Generic aliases
        get: 'Obtenido exitosamente',
        getAll: 'Obtenido exitosamente',

        // Common errors
        notFound: 'Registro de préstamo no encontrado',
        requestNotFound: 'Solicitud no encontrada',
        loanNotFound: 'Préstamo no encontrado',
        requestNotPending: 'La solicitud no está en estado pendiente',
        requestNotAccepted: 'La solicitud debe estar aprobada para registrar el préstamo',
        stockInsufficient: 'Stock insuficiente para uno o más ítems',
        movementTypeNotFound: 'No se encontró el tipo de movimiento requerido',
        lapseNotFound: 'No se encontró un período académico activo (lapse_act = true)',
        alreadyExists: 'Ya existe un registro con estos datos',
        invalidData: 'Datos inválidos',
        cannotDelete: 'No se puede eliminar el registro',
        permissionDenied: 'Permiso denegado',

        // Validation
        validation: {
            requiredField: 'Campo requerido',
            invalidFormat: 'Formato inválido',
            user: {
                required: 'El usuario es requerido',
            },
            lapse: {
                required: 'El período académico es requerido',
            },
            observation: {
                required: 'La observación es requerida',
            },
            inventory: {
                required: 'El inventario es requerido',
            },
            quantity: {
                min: 'La cantidad debe ser mayor a 0',
            },
            details: {
                required: 'Debe registrar al menos un detalle',
            },
        },
    },
    en: {
        // Success
        getRequest: 'Request retrieved successfully',
        getAllRequests: 'Requests retrieved successfully',
        requestLoan: 'Loan request created successfully',
        acceptRequestLoan: 'Request accepted successfully',
        rejectRequestLoan: 'Request rejected successfully',
        getLoan: 'Loan retrieved successfully',
        getAllLoans: 'Loans retrieved successfully',
        registerLoan: 'Loan registered successfully',

        // Generic aliases
        get: 'Retrieved successfully',
        getAll: 'Retrieved successfully',

        // Common errors
        notFound: 'Loan record not found',
        requestNotFound: 'Request not found',
        loanNotFound: 'Loan not found',
        requestNotPending: 'Request is not in pending status',
        requestNotAccepted: 'Request must be accepted before loan registration',
        stockInsufficient: 'Insufficient stock for one or more items',
        movementTypeNotFound: 'Required movement type was not found',
        lapseNotFound: 'No active academic period was found (lapse_act = true)',
        alreadyExists: 'Record already exists',
        invalidData: 'Invalid data',
        cannotDelete: 'Cannot delete record',
        permissionDenied: 'Permission denied',

        // Validation
        validation: {
            requiredField: 'Field required',
            invalidFormat: 'Invalid format',
            user: {
                required: 'User is required',
            },
            lapse: {
                required: 'Academic period is required',
            },
            observation: {
                required: 'Observation is required',
            },
            inventory: {
                required: 'Inventory is required',
            },
            quantity: {
                min: 'Quantity must be greater than 0',
            },
            details: {
                required: 'At least one detail line is required',
            },
        },
    }
}
