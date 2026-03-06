import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

/**
 * GET: 認証なしで /status/[id] 用の公開情報のみ返す。
 * service_role は API Route 内でのみ使用し、フロントに渡さない。
 */
export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "id is required" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();
    const { data: row, error } = await supabase
      .from("invoices")
      .select("id, submitter_name, vendor_name, target_month, status, reviewer_comment, created_at, submitted_at, approved_at")
      .eq("id", id)
      .single();

    if (error || !row) {
      return NextResponse.json(
        { success: false, message: error?.message ?? "Not found" },
        { status: error?.code === "PGRST116" ? 404 : 500 }
      );
    }

    const r = row as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      data: {
        id: r.id,
        submitterName: r.submitter_name,
        vendorName: r.vendor_name,
        targetMonth: r.target_month,
        status: r.status,
        reviewerComment: r.reviewer_comment,
        createdAt: r.created_at,
        submittedAt: r.submitted_at,
        approvedAt: r.approved_at,
      },
    });
  } catch (err) {
    console.error("invoices status [id] GET error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
