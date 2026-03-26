export const DevolutionQueries = {
    findAll: `
        SELECT
            m.movement_id,
            m.user_id,
            m.movement_booking_dt,
            m.movement_estimated_return_dt,
            m.movement_type_id,
            mt.movement_type_de,
            m.lapse_id,
            l.lapse_de,
            COUNT(md.movement_detail_id)::int AS total_items,
            COALESCE(SUM(
                CASE
                    WHEN ds.devolution_status_id IS NULL THEN 0
                    WHEN COALESCE(NULLIF(ds.returned_am_txt, ''), '0')::int >= md.movement_detail_am THEN 1
                    ELSE 0
                END
            ), 0)::int AS returned_items,
            COALESCE(SUM(
                CASE
                    WHEN ds.devolution_status_id IS NULL THEN 1
                    WHEN COALESCE(NULLIF(ds.returned_am_txt, ''), '0')::int < md.movement_detail_am THEN 1
                    ELSE 0
                END
            ), 0)::int AS pending_items,
            COALESCE(SUM(CASE WHEN ds.devolution_status_de = 'damaged' THEN 1 ELSE 0 END), 0)::int AS damaged_items
        FROM business.movement m
        INNER JOIN business.movement_type mt ON mt.movement_type_id = m.movement_type_id
        INNER JOIN business.lapse l ON l.lapse_id = m.lapse_id
        INNER JOIN business.movement_detail md ON md.movement_id = m.movement_id
        LEFT JOIN LATERAL (
            SELECT
                dss.devolution_status_id,
                dss.devolution_status_de,
                CASE
                    WHEN dss.devolution_status_ob IS NOT NULL
                     AND dss.devolution_status_ob ~ '^\\s*\\{'
                    THEN (dss.devolution_status_ob::jsonb ->> 'returned_am')
                    ELSE NULL
                END AS returned_am_txt
            FROM business.devolution_status dss
            WHERE dss.movement_detail_id = md.movement_detail_id
            ORDER BY dss.devolution_status_dt DESC NULLS LAST, dss.devolution_status_id DESC
            LIMIT 1
        ) ds ON TRUE
        WHERE m.movement_type_id IN (4, 5)
          AND ($1::bigint IS NULL OR m.user_id = $1)
          AND ($2::int IS NULL OR m.lapse_id = $2)
          AND ($3::timestamptz IS NULL OR m.movement_booking_dt >= $3)
          AND ($4::timestamptz IS NULL OR m.movement_booking_dt <= $4)
        GROUP BY
            m.movement_id,
            m.user_id,
            m.movement_booking_dt,
            m.movement_estimated_return_dt,
            m.movement_type_id,
            mt.movement_type_de,
            m.lapse_id,
            l.lapse_de
        ORDER BY m.movement_id DESC
    `,
    findById: `
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
            COUNT(md.movement_detail_id)::int AS total_items,
            COALESCE(SUM(
                CASE
                    WHEN ds.devolution_status_id IS NULL THEN 0
                    WHEN COALESCE(NULLIF(ds.returned_am_txt, ''), '0')::int >= md.movement_detail_am THEN 1
                    ELSE 0
                END
            ), 0)::int AS returned_items,
            COALESCE(SUM(
                CASE
                    WHEN ds.devolution_status_id IS NULL THEN 1
                    WHEN COALESCE(NULLIF(ds.returned_am_txt, ''), '0')::int < md.movement_detail_am THEN 1
                    ELSE 0
                END
            ), 0)::int AS pending_items,
            COALESCE(SUM(CASE WHEN ds.devolution_status_de = 'damaged' THEN 1 ELSE 0 END), 0)::int AS damaged_items
        FROM business.movement m
        INNER JOIN business.movement_type mt ON mt.movement_type_id = m.movement_type_id
        INNER JOIN business.lapse l ON l.lapse_id = m.lapse_id
        INNER JOIN business.movement_detail md ON md.movement_id = m.movement_id
        LEFT JOIN LATERAL (
            SELECT
                dss.devolution_status_id,
                dss.devolution_status_de,
                CASE
                    WHEN dss.devolution_status_ob IS NOT NULL
                     AND dss.devolution_status_ob ~ '^\\s*\\{'
                    THEN (dss.devolution_status_ob::jsonb ->> 'returned_am')
                    ELSE NULL
                END AS returned_am_txt
            FROM business.devolution_status dss
            WHERE dss.movement_detail_id = md.movement_detail_id
            ORDER BY dss.devolution_status_dt DESC NULLS LAST, dss.devolution_status_id DESC
            LIMIT 1
        ) ds ON TRUE
        WHERE m.movement_id = $1
        GROUP BY
            m.movement_id,
            m.user_id,
            m.movement_ob,
            m.movement_booking_dt,
            m.movement_estimated_return_dt,
            m.movement_type_id,
            mt.movement_type_de,
            m.lapse_id,
            l.lapse_de
    `,
    create: `
        INSERT INTO business.devolution_status (
            devolution_status_dt,
            devolution_status_de,
            devolution_status_ob,
            movement_detail_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `,
    update: `
        UPDATE business.movement
        SET movement_ob = COALESCE($2, movement_ob)
        WHERE movement_id = $1
        RETURNING movement_id
    `,
    delete: `
        DELETE FROM business.devolution_status ds
        USING business.movement_detail md
        WHERE md.movement_detail_id = ds.movement_detail_id
          AND md.movement_id = $1
    `,
    exists: `
        SELECT EXISTS(
            SELECT 1
            FROM business.devolution_status ds
            INNER JOIN business.movement_detail md ON md.movement_detail_id = ds.movement_detail_id
            WHERE md.movement_id = $1
        ) as "exists"
    `,
    findMovementTypeByMovementId: `
        SELECT movement_type_id
        FROM business.movement
        WHERE movement_id = $1
    `,
    findMovementDetailsByMovementId: `
        SELECT
            md.movement_detail_id,
            md.movement_detail_am,
            md.movement_detail_ob,
            md.inventory_id,
            md.movement_id
        FROM business.movement_detail md
        WHERE md.movement_id = $1
        ORDER BY md.movement_detail_id
    `,
    findDetailsWithLatestStatusByMovementId: `
        SELECT
            md.movement_detail_id,
            md.inventory_id,
            md.movement_detail_am,
            md.movement_detail_ob,
            COALESCE(NULLIF(ds.returned_am_txt, ''), '0')::int AS returned_am,
            GREATEST(md.movement_detail_am - COALESCE(NULLIF(ds.returned_am_txt, ''), '0')::int, 0)::int AS pending_am,
            ds.devolution_status_de,
            ds.devolution_status_dt,
            ds.devolution_status_ob
        FROM business.movement_detail md
        LEFT JOIN LATERAL (
            SELECT
                dss.devolution_status_de,
                dss.devolution_status_dt,
                dss.devolution_status_ob,
                CASE
                    WHEN dss.devolution_status_ob IS NOT NULL
                     AND dss.devolution_status_ob ~ '^\\s*\\{'
                    THEN (dss.devolution_status_ob::jsonb ->> 'returned_am')
                    ELSE NULL
                END AS returned_am_txt
            FROM business.devolution_status dss
            WHERE dss.movement_detail_id = md.movement_detail_id
            ORDER BY dss.devolution_status_dt DESC NULLS LAST, dss.devolution_status_id DESC
            LIMIT 1
        ) ds ON TRUE
        WHERE md.movement_id = $1
        ORDER BY md.movement_detail_id
    `,
    increaseInventoryStock: `
        UPDATE business.inventory
        SET inventory_qt = inventory_qt + $2,
            inventory_updated_dt = NOW()
        WHERE inventory_id = $1
    `,
    markMovementAsReturned: `
        UPDATE business.movement
        SET movement_type_id = 5,
            movement_ob = COALESCE($2, movement_ob)
        WHERE movement_id = $1
    `,
} as const

export type DevolutionQueryKey = keyof typeof DevolutionQueries
