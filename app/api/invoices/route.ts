import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, invoiceRowToInvoice, type InvoiceRow } from "@/lib/supabase";
import { generateNextShortId } from "@/lib/invoiceShortId";
import { getSessionFromRequest } from "@/lib/session";
import { canApproveInvoice, isExecutiveSubmitter } from "@/lib/auth-config";

/** GET: 一覧（要ログイン・middleware で 401）。役員担当の請求書は役員・経理のみ表示。 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const canApprove = canApproveInvoice(session);

    const supabase = getServerSupabase();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const targetMonth = searchParams.get("targetMonth");

    let query = supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (targetMonth) {
      query = query.eq("target_month", targetMonth);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("invoices list error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    let list = (rows ?? []).map((r) => invoiceRowToInvoice(r as InvoiceRow));
    // 役員担当の請求書は役員・経理のみ表示
    if (!canApprove) {
      list = list.filter((inv) => !isExecutiveSubmitter(inv.submitterName));
    }
    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    console.error("invoices GET error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** POST: 新規作成（アップロード・認証不要） */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      submitterName,
      vendorName,
      email,
      targetMonth,
      pdfBase64,
      type: bodyType,
    } = body;

    if (!submitterName || !vendorName || !targetMonth || !pdfBase64) {
      return NextResponse.json(
        { success: false, message: "submitterName, vendorName, targetMonth, pdfBase64 は必須です" },
        { status: 400 }
      );
    }

    const type =
      bodyType === "payment" || bodyType === "receipt" ? bodyType : "received";

    const supabase = getServerSupabase();

    const maxAttempts = 3;
    let insertRow: { id: string } | null = null;
    let insertError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const shortId = await generateNextShortId(supabase);
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          short_id: shortId,
          submitter_name: String(submitterName).trim(),
          vendor_name: String(vendorName).trim(),
          client_name: "",
          email: email != null && String(email).trim() !== "" ? String(email).trim() : "",
          target_month: String(targetMonth).trim().slice(0, 7),
          file_path: null,
          status: "draft",
          type,
        })
        .select("id")
        .single();

      if (!error) {
        insertRow = data;
        break;
      }
      if (error.code === "23505") {
        insertError = error;
        continue;
      }
      insertError = error;
      break;
    }

    if (insertError || !insertRow) {
      console.error("invoices insert error:", insertError);
      return NextResponse.json(
        { success: false, message: (insertError as Error)?.message ?? "Failed to create invoice" },
        { status: 500 }
      );
    }

    const invoiceId = insertRow.id;
    const base64Data = String(pdfBase64).replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const path = `tmp/${invoiceId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(path, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      await supabase.from("invoices").delete().eq("id", invoiceId);
      console.error("invoices storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, message: "PDFのアップロードに失敗しました" },
        { status: 500 }
      );
    }

    await supabase
      .from("invoices")
      .update({ file_path: path })
      .eq("id", invoiceId);

    const { data: row } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (!row) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch created invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoiceRowToInvoice(row as InvoiceRow),
    });
  } catch (err) {
    console.error("invoices POST error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
