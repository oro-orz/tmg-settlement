import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** 承認履歴テーブルの型（Supabase の Row） */
export interface ApprovalHistoryRow {
  id: string;
  application_id: string;
  action: string;
  checker: string;
  comment: string | null;
  created_at: string;
}

/** サーバー専用 Supabase クライアント（service_role）。API ルート・Server Components で使用 */
export function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  return createClient(url, key);
}
