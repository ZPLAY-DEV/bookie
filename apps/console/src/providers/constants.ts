// 로컬 스택 기본값 — anon key는 모든 로컬 Supabase가 공유하는 공개 데모 값 (docs/LOCALSTACK.md)
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
