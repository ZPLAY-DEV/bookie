import { createMiddleware } from 'hono/factory'
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose'
import type { AppEnv } from '../env'

// Supabase Auth(GoTrue)는 비대칭 키(ES256)로 서명하고 공개키를 JWKS로 노출한다.
// HS256은 레거시 JWT secret 프로젝트용 폴백. (motionfit과 동일한 방식)
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()
function jwksFor(supabaseUrl: string) {
  let jwks = jwksCache.get(supabaseUrl)
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
    )
    jwksCache.set(supabaseUrl, jwks)
  }
  return jwks
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = header.slice(7)
  try {
    const { alg } = decodeProtectedHeader(token)
    const { payload } =
      alg === 'HS256'
        ? await jwtVerify(
            token,
            new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET),
          )
        : await jwtVerify(token, jwksFor(c.env.SUPABASE_URL))
    if (!payload.sub) return c.json({ error: 'Unauthorized' }, 401)
    c.set('user', {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    })
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})
