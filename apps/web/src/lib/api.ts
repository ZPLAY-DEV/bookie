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

// R2(bktk 버킷) 오브젝트 URL. filename을 주면 다운로드로 내려받는다.
export function mediaUrl(key: string, filename?: string) {
  const url = `${apiBaseUrl}/api/files/${key}`
  return filename ? `${url}?filename=${encodeURIComponent(filename)}` : url
}

// 수업 자료 URL — 파일명 규칙(w{주차}d{일차}*)에서 폴더를 유도해
// lessons/w1d5/w1d5_lesson.pdf 형태의 키를 만든다.
export function lessonFileUrl(filename: string, downloadName?: string) {
  const folder = filename.split('_')[0].split('.')[0] // w1d5_lesson.pdf → w1d5
  return mediaUrl(`lessons/${folder}/${filename}`, downloadName)
}
