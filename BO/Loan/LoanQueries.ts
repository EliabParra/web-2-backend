export const LoanQueries = {
    findMovementTypeIdByKeyword: `
        SELECT movement_type_id
        FROM business.movement_type
        WHERE LOWER(movement_type_de) LIKE ('%' || LOWER($1) || '%')
        ORDER BY movement_type_id
        LIMIT 1
    `,

    findActiveLapseId: `
        SELECT lapse_id
        FROM business.lapse
        WHERE lapse_act = TRUE
        ORDER BY lapse_start_dt DESC NULLS LAST, lapse_id DESC
        LIMIT 1
    `,

    findRequestById: `
        SELECT
            m.movement_id,
            m.movement_booking_dt,
            m.movement_estimated_return_dt,
            m.movement_ob,
            m.user_id,
            m.movement_type_id,
            mt.movement_type_de,
            m.lapse_id,
            l.lapse_de
        FROM business.movement m
        INNER JOIN business.movement_type mt ON mt.movement_type_id = m.movement_type_id
        INNER JOIN business.lapse l ON l.lapse_id = m.lapse_id
        WHERE m.movement_id = $1
                    AND m.movement_type_id = ANY($2::int[])
    `,

    findAllRequests: `
        SELECT
            m.movement_id,
            m.user_id,
            m.movement_ob,
            m.movement_booking_dt,
            m.movement_estimated_return_dt,
            m.movement_type_id,
            mt.movement_type_de,
            m.lapse_id,
            l.lapse_de,
            (
                SELECT COUNT(*)::int
                FROM business.movement_detail md
                WHERE md.movement_id = m.movement_id
            ) as total_items
        FROM business.movement m
        INNER JOIN business.movement_type mt ON mt.movement_type_id = m.movement_type_id
        INNER JOIN business.lapse l ON l.lapse_id = m.lapse_id
                WHERE m.movement_type_id = ANY($1::int[])
          AND ($2::bigint IS NULL OR m.user_id = $2)
          AND ($3::int IS NULL OR m.lapse_id = $3)
          AND ($4::timestamptz IS NULL OR m.movement_booking_dt >= $4)
          AND ($5::timestamptz IS NULL OR m.movement_booking_dt <= $5)
        ORDER BY m.movement_id DESC
    `,

    createRequest: `
        INSERT INTO business.movement (
            movement_booking_dt,
            movement_estimated_return_dt,
            movement_ob,
            user_id,
            movement_type_id,
            lapse_id
        )
        VALUES (NOW(), NULL, $1, $2, $3, $4)
        RETURNING *
    `,

    acceptRequest: `
        UPDATE business.movement
        SET
            movement_type_id = $2,
            movement_estimated_return_dt = $3,
            movement_ob = COALESCE($4, movement_ob)
        WHERE movement_id = $1
        RETURNING *
    `,

    rejectRequest: `
        UPDATE business.movement
        SET
            movement_type_id = $2,
            movement_ob = $3
        WHERE movement_id = $1
        RETURNING *
    `,

    findLoanById: `
        SELECT
            m.movement_id,
            m.movement_booking_dt,
            m.movement_estimated_return_dt,
            m.movement_ob,
            m.user_id,
            m.movement_type_id,
            mt.movement_type_de,
            m.lapse_id,
            l.lapse_de
        FROM business.movement m
        INNER JOIN business.movement_type mt ON mt.movement_type_id = m.movement_type_id
        INNER JOIN business.lapse l ON l.lapse_id = m.lapse_id
        WHERE m.movement_id = $1
          AND m.movement_type_id = $2
    `,

    findAllLoans: `
        SELECT
            m.movement_id,
            m.user_id,
            m.movement_booking_dt,
            m.movement_estimated_return_dt,
            m.lapse_id,
            l.lapse_de,
            m.movement_type_id,
            mt.movement_type_de,
            (
                SELECT COUNT(*)::int
                FROM business.movement_detail md
                WHERE md.movement_id = m.movement_id
            ) as total_items
        FROM business.movement m
        INNER JOIN business.movement_type mt ON mt.movement_type_id = m.movement_type_id
        INNER JOIN business.lapse l ON l.lapse_id = m.lapse_id
        WHERE m.movement_type_id = $1
          AND ($2::bigint IS NULL OR m.user_id = $2)
          AND ($3::int IS NULL OR m.lapse_id = $3)
          AND ($4::timestamptz IS NULL OR m.movement_booking_dt >= $4)
          AND ($5::timestamptz IS NULL OR m.movement_booking_dt <= $5)
        ORDER BY m.movement_id DESC
    `,

    findLoanDetails: `
        SELECT
            md.movement_detail_id,
            md.movement_detail_dt,
            md.movement_detail_am,
            md.movement_detail_ob,
            md.inventory_id,
            md.movement_id,
            inv.item_id,
            i.item_cod,
            i.item_na,
            inv.location_id,
            l.location_de,
            inv.inventory_qt
        FROM business.movement_detail md
        INNER JOIN business.inventory inv ON inv.inventory_id = md.inventory_id
        INNER JOIN business.item i ON i.item_id = inv.item_id
        INNER JOIN business.location l ON l.location_id = inv.location_id
        WHERE md.movement_id = $1
        ORDER BY md.movement_detail_id ASC
    `,

    findInventoryById: `
        SELECT
            inv.inventory_id,
            inv.inventory_qt,
            inv.item_id,
            i.item_na,
            i.item_cod,
            c.category_type_id
        FROM business.inventory inv
        INNER JOIN business.item i ON i.item_id = inv.item_id
        INNER JOIN business.category c ON c.category_id = i.category_id
        WHERE inv.inventory_id = $1
    `,

    decreaseInventoryStock: `
        UPDATE business.inventory
        SET
            inventory_qt = inventory_qt - $2,
            inventory_updated_dt = NOW()
        WHERE inventory_id = $1
          AND inventory_qt >= $2
        RETURNING inventory_id
    `,

    insertMovementDetail: `
        INSERT INTO business.movement_detail (
            movement_detail_dt,
            movement_detail_am,
            movement_detail_ob,
            inventory_id,
            movement_id
        )
        VALUES (NOW(), $2, $3, $1, $4)
        RETURNING *
    `,

    deleteMovementDetailsByMovementId: `
        DELETE FROM business.movement_detail
        WHERE movement_id = $1
    `,

    markMovementAsLoan: `
        UPDATE business.movement
        SET
            movement_type_id = $2,
            movement_booking_dt = COALESCE($3::timestamptz, movement_booking_dt, NOW()),
            movement_ob = COALESCE($4, movement_ob)
        WHERE movement_id = $1
        RETURNING *
    `,
} as const

export type LoanQueryKey = keyof typeof LoanQueries
