import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// 빌드 시점(환경변수가 아직 없을 수 있음)에는 생성하지 않고,
// 실제로 호출되는 시점에만 초기화한다.
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase 환경변수가 없습니다. web/.env.local에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하세요."
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}
