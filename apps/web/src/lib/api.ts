import { hc } from 'hono/client'
import type { AppType } from 'api'

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

// 서버 라우트 타입이 그대로 클라이언트에 흐르는 엔드투엔드 타입 안전 클라이언트.
// 사용 예: const res = await api.api.weeks.$get()
export const api = hc<AppType>(apiBaseUrl)

// R2(media 버킷) 오브젝트 URL. filename을 주면 다운로드로 내려받는다.
export function mediaUrl(key: string, filename?: string) {
  const url = `${apiBaseUrl}/api/files/${key}`
  return filename ? `${url}?filename=${encodeURIComponent(filename)}` : url
}
