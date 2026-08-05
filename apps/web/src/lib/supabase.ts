import { createClient } from '@supabase/supabase-js'

// 로컬 스택 기본값 — anon key는 모든 로컬 Supabase가 공유하는 공개 데모 값 (docs/LOCALSTACK.md)
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// 로그인/세션(Auth) 전용 — 데이터는 hono 클라이언트로 API 경유
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true },
})
