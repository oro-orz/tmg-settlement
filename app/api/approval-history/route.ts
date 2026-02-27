import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import type { ApprovalHistoryItem } from "@/lib/types";

const TABLE = "approval_history";

/** 申請IDに紐づく承認履歴を取得 */
export async function GET(request: NextRequest) {
  const applicationId = request.nextUrl.searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json(
      { error: "applicationId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, application_id, action, checker, comment, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase approval_history GET error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const items: ApprovalHistoryItem[] = (data ?? []).map((row) => ({
      id: row.id,
      applicationId: row.application_id,
      action: row.action,
      checker: row.checker,
      comment: row.comment ?? null,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get approval history";
    if (message.includes("must be set")) {
      return NextResponse.json(
        { error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 }
      );
    }
    console.error("approval-history GET:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 承認履歴を 1 件追加（スプシには書き戻さない） */
export async function POST(request: NextRequest) {
  let body: {
    applicationId?: string;
    action?: string;
    checker?: string;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { applicationId, action, checker, comment } = body;
  const allowedActions = [
    "accounting_approve",
    "accounting_reject",
    "send_to_executive",
    "executive_approve",
    "executive_reject",
    "cancel_approval",
  ];
  if (
    !applicationId ||
    !action ||
    !allowedActions.includes(action) ||
    !checker
  ) {
    return NextResponse.json(
      {
        error:
          "applicationId, action (one of " +
          allowedActions.join(", ") +
          "), and checker are required",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        application_id: applicationId,
        action,
        checker,
        comment: comment ?? null,
      })
      .select("id, application_id, action, checker, comment, created_at")
      .single();

    if (error) {
      console.error("Supabase approval_history POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const item: ApprovalHistoryItem = {
      id: data.id,
      applicationId: data.application_id,
      action: data.action,
      checker: data.checker,
      comment: data.comment ?? null,
      createdAt: data.created_at,
    };
    return NextResponse.json({ item });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add approval history";
    if (message.includes("must be set")) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 503 }
      );
    }
    console.error("approval-history POST:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
