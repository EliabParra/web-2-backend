/**
 * Auto-generated data for security.sessions
 * Generated at: 2026-02-20T10:28:05.131Z
 */
export const DATA_SESSIONS_SCHEMA = [
    `INSERT INTO security.sessions (sid, sess, expire) VALUES ('EXoGxpqkb9YanZ9pkqPvjeHv5JeLaKAd', '{"cookie":{"originalMaxAge":1800000,"expires":"2026-02-20T01:36:03.802Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"csrfToken":"15d565e4ea429e4aed8778f3db167c4ee496cdad0bf12a7a0da755d856e400dc","userId":"1","username":"admin","profileId":"1","email":"eliabparra@gmail.com"}', '2026-02-20T05:37:35.000Z') ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire;`,
]
