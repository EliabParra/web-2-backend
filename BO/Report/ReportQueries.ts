export const ReportQueries = {
    findMovementTypeIdByKeyword: `
        SELECT movement_type_id
        FROM business.movement_type
        WHERE LOWER(movement_type_de) LIKE ('%' || LOWER($1) || '%')
        ORDER BY movement_type_id
        LIMIT 1
    `,

    overdueLoansByUser: `
        SELECT
            m.user_id,
            COUNT(DISTINCT m.movement_id)::int AS loans_overdue,
            COALESCE(SUM(md.movement_detail_am), 0)::int AS items_overdue,
            MIN(m.movement_estimated_return_dt) AS oldest_due_dt
        FROM business.movement m
        LEFT JOIN business.movement_detail md ON md.movement_id = m.movement_id
        WHERE m.movement_type_id = $1
          AND m.movement_estimated_return_dt IS NOT NULL
          AND m.movement_estimated_return_dt < NOW()
          AND ($2::bigint IS NULL OR m.user_id = $2)
          AND ($3::int IS NULL OR m.lapse_id = $3)
          AND ($4::timestamptz IS NULL OR m.movement_booking_dt >= $4)
          AND ($5::timestamptz IS NULL OR m.movement_booking_dt <= $5)
        GROUP BY m.user_id
        ORDER BY loans_overdue DESC, items_overdue DESC, m.user_id ASC
    `,

    solvencyByUser: `
        SELECT
            m.user_id,
            COUNT(DISTINCT m.movement_id)::int AS active_loans,
            COUNT(DISTINCT m.movement_id) FILTER (
                WHERE m.movement_estimated_return_dt IS NOT NULL
                  AND m.movement_estimated_return_dt < NOW()
            )::int AS overdue_loans,
            COALESCE(SUM(md.movement_detail_am), 0)::int AS borrowed_items
        FROM business.movement m
        LEFT JOIN business.movement_detail md ON md.movement_id = m.movement_id
        WHERE m.movement_type_id = $1
          AND ($2::bigint IS NULL OR m.user_id = $2)
          AND ($3::int IS NULL OR m.lapse_id = $3)
          AND ($4::timestamptz IS NULL OR m.movement_booking_dt >= $4)
          AND ($5::timestamptz IS NULL OR m.movement_booking_dt <= $5)
        GROUP BY m.user_id
        ORDER BY m.user_id ASC
    `,

    devolutionStats: `
        SELECT
            COUNT(*)::int AS total_events,
            COUNT(*) FILTER (WHERE LOWER(ds.devolution_status_de) = 'completed')::int AS completed_events,
            COUNT(*) FILTER (WHERE LOWER(ds.devolution_status_de) = 'partial')::int AS partial_events,
            COUNT(*) FILTER (WHERE LOWER(ds.devolution_status_de) = 'damaged')::int AS damaged_events
        FROM business.devolution_status ds
        INNER JOIN business.movement_detail md ON md.movement_detail_id = ds.movement_detail_id
        INNER JOIN business.movement m ON m.movement_id = md.movement_id
        WHERE ($1::bigint IS NULL OR m.user_id = $1)
          AND ($2::int IS NULL OR m.lapse_id = $2)
          AND ($3::timestamptz IS NULL OR ds.devolution_status_dt >= $3)
          AND ($4::timestamptz IS NULL OR ds.devolution_status_dt <= $4)
    `,

    noopDelete: `
        SELECT 0::int AS rowCount
    `,

    alwaysExists: `
        SELECT TRUE as "exists"
    `,
} as const

export type ReportQueryKey = keyof typeof ReportQueries
