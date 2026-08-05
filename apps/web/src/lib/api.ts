import { hc } from 'hono/client'
import type { AppType } from 'api'
import { supabase } from './supabase'

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

// 서버 라우트 타입이 그대로 클라이언트에 흐르는 엔드투엔드 타입 안전 클라이언트.
// 세션이 있으면 모든 호출에 Bearer 토큰을 자동으로 붙인다 (API 읽기가 승인자 전용).
export const api = hc<AppType>(apiBaseUrl, {
  fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const headers = new Headers(init?.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(input, { ...init, headers })
  }) as typeof fetch,
})

