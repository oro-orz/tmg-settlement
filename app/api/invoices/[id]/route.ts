import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, invoiceRowToInvoice, type InvoiceRow } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

/** GET: 1件取得（要ログイン） */
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
      .select("*")
      .eq("id", id)
      .single();

    if (error || !row) {
      return NextResponse.json(
        { success: false, message: error?.message ?? "Not found" },
        { status: error?.code === "PGRST116" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoiceRowToInvoice(row as InvoiceRow),
    });
  } catch (err) {
    console.error("invoices [id] GET error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** PATCH: 更新（ステータス・human_checked・経理提出など） */
export async function PATCH(
  request: NextRequest,
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

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) updates.status = body.status;
    if (body.aiResult !== undefined) updates.ai_result = body.aiResult;
    if (body.humanChecked !== undefined) updates.human_checked = body.humanChecked;
    if (body.reviewerComment !== undefined) updates.reviewer_comment = body.reviewerComment;

    if (body.status === "submitted") {
      updates.submitted_at = new Date().toISOString();
    }
    if (body.status === "approved") {
      updates.approved_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "No fields to update" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();
    const { data: row, error } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("invoices [id] PATCH error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoiceRowToInvoice(row as InvoiceRow),
    });
  } catch (err) {
    console.error("invoices [id] PATCH error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** DELETE: 1件削除（DB と Storage の PDF） */
export async function DELETE(
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
    const { data: row, error: fetchError } = await supabase
      .from("invoices")
      .select("file_path")
      .eq("id", id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json(
        { success: false, message: fetchError?.message ?? "Not found" },
        { status: fetchError?.code === "PGRST116" ? 404 : 500 }
      );
    }

    const filePath = (row as { file_path: string | null }).file_path;
    if (filePath) {
      await supabase.storage.from("invoices").remove([filePath]);
    }

    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("invoices [id] DELETE error:", deleteError);
      return NextResponse.json(
        { success: false, message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("invoices [id] DELETE error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
