import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../env'
import { requireAdmin, requireAuth } from '../middleware/auth'

// 업로드 허용 키: lessons/w{주차}d{일차}/파일명.확장자
const UPLOAD_KEY_RE =
  /^lessons\/w\d{1,2}d[1-5]\/[A-Za-z0-9._-]+\.(png|jpg|jpeg|webp|gif|pdf|mp3|mp4)$/i

const PRESIGN_TTL_MS = 5 * 60 * 1000 // 5분

// SUPABASE_JWT_SECRET으로 `key\nexp`를 HMAC-SHA256 서명 → hex
async function signUpload(secret: string, key: string, exp: number) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(`${key}\n${exp}`),
  )
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// R2(media 버킷) 오브젝트 서빙 — 수업 이미지, 지도안/수업자료 다운로드에 사용
export const files = new Hono<AppEnv>()
  // 관리자 전용: 브라우저가 R2로 직접 업로드할 수 있는 서명 URL 발급
  .post(
    '/presign',
    requireAuth,
    requireAdmin,
    zValidator('json', z.object({ key: z.string().regex(UPLOAD_KEY_RE) })),
    async (c) => {
      const { key } = c.req.valid('json')
      const exp = Date.now() + PRESIGN_TTL_MS
      const sig = await signUpload(c.env.SUPABASE_JWT_SECRET, key, exp)
      // 호스트는 클라이언트가 자기 API base로 붙인다
      // (wrangler dev에서는 c.req.url의 호스트가 route 설정값으로 나와 신뢰할 수 없음)
      const path = `/api/files/upload/${key}?exp=${exp}&sig=${sig}`
      return c.json({ path, key, expiresAt: exp })
    },
  )
  // presign 서명 검증 후 R2에 저장 (Authorization 불필요 — URL 자체가 자격)
  .put('/upload/*', async (c) => {
    const key = c.req.path.replace(/^\/api\/files\/upload\//, '')
    const exp = Number(c.req.query('exp'))
    const sig = c.req.query('sig')
    if (!UPLOAD_KEY_RE.test(key) || !exp || !sig) {
      return c.json({ error: 'Invalid upload URL' }, 400)
    }
    if (Date.now() > exp) {
      return c.json({ error: 'Upload URL expired' }, 403)
    }
    const expected = await signUpload(c.env.SUPABASE_JWT_SECRET, key, exp)
    if (sig !== expected) {
      return c.json({ error: 'Invalid signature' }, 403)
    }
    const body = await c.req.arrayBuffer()
    if (body.byteLength === 0) return c.json({ error: 'Empty file' }, 400)
    const filename = key.split('/').pop() ?? 'file'
    await c.env.MEDIA.put(key, body, {
      httpMetadata: {
        contentType:
          c.req.header('Content-Type') ?? 'application/octet-stream',
        // PDF는 cdn.bktk.kr에서 바로 다운로드되도록 (R2 직접 서빙엔 ?filename= 훅이 없다)
        ...(key.toLowerCase().endsWith('.pdf')
          ? {
              contentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
            }
          : {}),
      },
    })
    return c.json({ key })
  })
  .get('/*', async (c) => {
    const key = c.req.path.replace(/^\/api\/files\//, '')
    if (!key) return c.json({ error: 'File not found' }, 404)

    const object = await c.env.MEDIA.get(key)
    if (!object) return c.json({ error: 'File not found' }, 404)

    c.header(
      'Content-Type',
      object.httpMetadata?.contentType ?? 'application/octet-stream',
    )
    c.header('ETag', object.httpEtag)
    c.header('Cache-Control', 'public, max-age=3600')
    // ?filename=... 이면 해당 이름의 첨부파일로 다운로드
    const filename = c.req.query('filename')
    if (filename) {
      c.header(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      )
    }
    // workers-types의 ReadableStream과 DOM lib의 ReadableStream이 달라
    // web(tsc, DOM lib)에서 이 파일을 함께 컴파일할 때를 위해 캐스팅한다
    return c.body(object.body as unknown as ReadableStream)
  })
