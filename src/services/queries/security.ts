export const SecurityQueries = {
    // Load all permissions: profile_id -> object_name.method_name
    loadPermissions: `
        SELECT 
            p.profile_id,
            o.object_name, 
            m.method_name
        FROM security.profile_method pm
        INNER JOIN security.profiles p ON pm.profile_id = p.profile_id
        INNER JOIN security.methods m ON pm.method_id = m.method_id
        INNER JOIN security.objects o ON m.object_id = o.object_id
    `,

    // Grant permission (Dual Write Support)
    // We need to look up object_id and method_id from names first?
    // Or we assume we have IDs? The plan says "grantPermission(profileId, objectName, methodName)".
    // So we likely need a subquery or a helper to get IDs.
    // Let's rely on finding IDs via joins or separate lookups.
    // A complex insert might be safer.
    grantPermission: `
        INSERT INTO security.profile_method (profile_id, method_id)
        SELECT $1, m.method_id
        FROM security.methods m
        INNER JOIN security.objects o ON m.object_id = o.object_id
        WHERE o.object_name = $2 AND m.method_name = $3
        ON CONFLICT DO NOTHING
        RETURNING profile_method_id
    `,

    revokePermission: `
        DELETE FROM security.profile_method
        WHERE profile_id = $1
        AND method_id = (
            SELECT m.method_id
            FROM security.methods m
            INNER JOIN security.objects o ON m.object_id = o.object_id
            WHERE o.object_name = $2 AND m.method_name = $3
        )
    `,
}
