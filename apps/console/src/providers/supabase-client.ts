import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./constants";

// 데이터는 전부 Hono API 경유 — supabase-js는 로그인/세션(Auth) 전용 (docs/CONSOLE.md)
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
  },
});
