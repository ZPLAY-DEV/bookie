import { Hono } from 'hono'
import type { AppEnv } from '../env'

// R2(media 버킷) 오브젝트 서빙 — 수업 이미지, 지도안/수업자료 다운로드에 사용
export const files = new Hono<AppEnv>().get('/*', async (c) => {
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
