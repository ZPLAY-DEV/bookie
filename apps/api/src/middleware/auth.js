import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { createDb } from '../db';
import { getAdminUser, getUser } from '../services/user.service';
// Supabase Auth(GoTrue)는 비대칭 키(ES256)로 서명하고 공개키를 JWKS로 노출한다.
// HS256은 레거시 JWT secret 프로젝트용 폴백. (motionfit과 동일한 방식)
const jwksCache = new Map();
function jwksFor(supabaseUrl) {
    let jwks = jwksCache.get(supabaseUrl);
    if (!jwks) {
        jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
        jwksCache.set(supabaseUrl, jwks);
    }
    return jwks;
}
export const requireAuth = createMiddleware(async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = header.slice(7);
    try {
        const { alg } = decodeProtectedHeader(token);
        const { payload } = alg === 'HS256'
            ? await jwtVerify(token, new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET))
            : await jwtVerify(token, jwksFor(c.env.SUPABASE_URL));
        if (!payload.sub)
            return c.json({ error: 'Unauthorized' }, 401);
        c.set('user', {
            id: payload.sub,
            email: typeof payload.email === 'string' ? payload.email : undefined,
            phone: typeof payload.phone === 'string' && payload.phone !== ''
                ? payload.phone
                : undefined,
        });
    }
    catch {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
});
// 승인된 사용자(teacher/admin)만 통과 — requireAuth 뒤에 체이닝해서 사용
export const requireMember = createMiddleware(async (c, next) => {
    const authUser = c.get('user');
    const db = createDb(c.env.DATABASE_URL);
    const user = await getUser(db, authUser.id);
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return c.json({ error: '승인 대기 중인 계정입니다' }, 403);
    }
    await next();
});
// 관리자(admin_users 뷰)만 통과 — requireAuth 뒤에 체이닝해서 사용
export const requireAdmin = createMiddleware(async (c, next) => {
    const authUser = c.get('user');
    const db = createDb(c.env.DATABASE_URL);
    const admin = await getAdminUser(db, authUser.id);
    if (!admin) {
        return c.json({ error: '관리자 권한이 필요합니다' }, 403);
    }
    await next();
});
