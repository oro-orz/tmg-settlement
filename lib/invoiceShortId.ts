import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 当月の次の short_id（YYYYMM-001 形式）を取得する。
 * 同時挿入で重複する場合は呼び出し側で UNIQUE 違反をキャッチしてリトライすること。
 */
export async function generateNextShortId(
  supabase: SupabaseClient
): Promise<string> {
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  const prefix = `${yyyymm}-`;

  const { data: rows } = await supabase
    .from("invoices")
    .select("short_id")
    .like("short_id", `${prefix}%`);

  let next = 1;
  if (rows?.length) {
    const nums = rows
      .map((r: { short_id: string }) => {
        const part = r.short_id.split("-")[1];
        return part ? parseInt(part, 10) : 0;
      })
      .filter((n: number) => !Number.isNaN(n));
    if (nums.length) next = Math.max(...nums) + 1;
  }

  return `${yyyymm}-${String(next).padStart(3, "0")}`;
}
