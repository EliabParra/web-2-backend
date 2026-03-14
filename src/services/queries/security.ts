export const SecurityQueries = {
    // Load all permissions: profile_id -> object_name.method_na
    loadPermissions: `
        SELECT 
            p.profile_id,
            o.object_na, 
            m.method_na
        FROM security.profile_method pm
        INNER JOIN security.profile p ON pm.profile_id = p.profile_id
        INNER JOIN security.method m ON pm.method_id = m.method_id
        INNER JOIN security.object_method om ON m.method_id = om.method_id
        INNER JOIN security.object o ON om.object_id = o.object_id
    `,

    // Grant permission (Dual Write Support)
    grantPermission: `
        INSERT INTO security.profile_method (profile_id, method_id)
        SELECT $1, m.method_id
        FROM security.method m
        INNER JOIN security.object_method om ON m.method_id = om.method_id
        INNER JOIN security.object o ON om.object_id = o.object_id
        WHERE o.object_na = $2 AND m.method_na = $3
        ON CONFLICT DO NOTHING
        RETURNING profile_method_id
    `,

    revokePermission: `
        DELETE FROM security.profile_method
        WHERE profile_id = $1
        AND method_id = (
            SELECT m.method_id
            FROM security.method m
            INNER JOIN security.object_method om ON m.method_id = om.method_id
            INNER JOIN security.object o ON om.object_id = o.object_id
            WHERE o.object_na = $2 AND m.method_na = $3
        )
    `,
}
