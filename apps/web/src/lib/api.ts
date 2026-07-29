import { hc } from 'hono/client'
import type { AppType } from 'api'

// 서버 라우트 타입이 그대로 클라이언트에 흐르는 엔드투엔드 타입 안전 클라이언트.
// 사용 예: const res = await api.api.weeks.$get()
export const api = hc<AppType>(
  import.meta.env.VITE_API_URL ?? 'http://localhost:8787',
)
