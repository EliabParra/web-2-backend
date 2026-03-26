export const ProfileQueries = {
    findAll: `
        SELECT
            p.*,
            COALESCE((SELECT array_agg(DISTINCT subsystem_id ORDER BY subsystem_id) FROM security.profile_subsystem WHERE profile_id = p.profile_id), '{}') as subsystem_ids,
            COALESCE((SELECT array_agg(DISTINCT menu_id ORDER BY menu_id) FROM security.profile_menu WHERE profile_id = p.profile_id), '{}') as menu_ids,
            COALESCE((SELECT array_agg(DISTINCT option_id ORDER BY option_id) FROM security.profile_option WHERE profile_id = p.profile_id), '{}') as option_ids
        FROM security.profile p
        WHERE ($1::text IS NULL OR LOWER(p.profile_na) LIKE ('%' || LOWER($1) || '%'))
        ORDER BY p.profile_id DESC
    `,
    findById: `
        SELECT
            p.*,
            COALESCE((SELECT array_agg(DISTINCT subsystem_id ORDER BY subsystem_id) FROM security.profile_subsystem WHERE profile_id = p.profile_id), '{}') as subsystem_ids,
            COALESCE((SELECT array_agg(DISTINCT menu_id ORDER BY menu_id) FROM security.profile_menu WHERE profile_id = p.profile_id), '{}') as menu_ids,
            COALESCE((SELECT array_agg(DISTINCT option_id ORDER BY option_id) FROM security.profile_option WHERE profile_id = p.profile_id), '{}') as option_ids
        FROM security.profile p
        WHERE p.profile_id = $1
    `,
    create: `
        INSERT INTO security.profile (profile_na) VALUES ($1) RETURNING *
    `,
    update: `
        UPDATE security.profile SET profile_na = $2 WHERE profile_id = $1 RETURNING *
    `,
    delete: `
        DELETE FROM security.profile WHERE profile_id = $1
    `,
    exists: `
        SELECT EXISTS(SELECT 1 FROM security.profile WHERE profile_id = $1) as "exists"
    `,
} as const

export type ProfileQueryKey = keyof typeof ProfileQueries
