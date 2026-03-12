import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

/** GET: 担当者一覧（Chatwork 用。認証不要） */
export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data: rows, error } = await supabase
      .from("chatwork_assignees")
      .select("account_id, account_name")
      .order("account_name", { ascending: true });

    if (error) {
      console.error("assignees GET error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const data = (rows ?? []).map((r: { account_id: string; account_name: string }) => ({
      accountId: r.account_id,
      accountName: r.account_name,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("assignees GET error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
