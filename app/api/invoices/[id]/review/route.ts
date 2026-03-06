import { NextRequest, NextResponse } from "next/server";
import {
  buildInvoiceFileName,
  buildPaymentFileName,
  buildReceiptFileName,
  sanitize,
} from "@/lib/invoiceFileName";
import { getServerSupabase, invoiceRowToInvoice, type InvoiceRow } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Params = { params: Promise<{ id: string }> };

const BUCKET = "invoices";

/** 同一フォルダ内の重複を避けるファイル名と保存先パスを決定。売掛は請求先名(partnerName)、買掛・領収書は請求元名を使用 */
async function resolveFileName(
  supabase: SupabaseClient,
  partnerName: string,
  targetMonth: string,
  type: "received" | "payment" | "receipt"
): Promise<{ fileName: string; destPath: string }> {
  const safeName = sanitize(partnerName);
  const folderPath = `${targetMonth}/${safeName}`;
  let version = 1;
  while (true) {
    const fileName =
      type === "payment"
        ? buildPaymentFileName(partnerName, targetMonth, version)
        : type === "receipt"
          ? buildReceiptFileName(partnerName, targetMonth, version)
          : buildInvoiceFileName(partnerName, targetMonth, version);
    const destPath = `${folderPath}/${fileName}`;

    const { data } = await supabase.storage.from(BUCKET).list(folderPath);
    const exists = data?.some((f) => f.name === fileName) ?? false;
    if (!exists) return { fileName, destPath };
    version++;
  }
}

/** POST: 承認 or 差し戻し（要ログイン） */
export async function POST(
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
    const { action, reviewer, comment } = body;

    if (!action || !reviewer) {
      return NextResponse.json(
        { success: false, message: "action と reviewer は必須です" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, message: "action は approve または reject です" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, file_path, vendor_name, client_name, target_month, type")
      .eq("id", id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { success: false, message: fetchError?.message ?? "Not found" },
        { status: fetchError ? 500 : 404 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "returned";
    const updates: Record<string, unknown> = {
      status: newStatus,
      reviewer_comment: comment != null ? String(comment) : null,
    };

    if (action === "approve") {
      updates.approved_at = new Date().toISOString();

      const filePath = invoice.file_path as string | null;
      if (filePath && filePath.startsWith("tmp/")) {
        const type = invoice.type === "payment" ? "payment" : invoice.type === "receipt" ? "receipt" : "received";
        const partnerName =
          type === "received"
            ? ((invoice.client_name ?? "").trim() || invoice.vendor_name)
            : invoice.vendor_name;
        const { fileName, destPath } = await resolveFileName(
          supabase,
          partnerName,
          invoice.target_month,
          type
        );

        const { error: copyError } = await supabase.storage
          .from(BUCKET)
          .copy(filePath, destPath);
        if (copyError) {
          console.error("invoices approve copy error:", copyError);
          return NextResponse.json(
            { success: false, message: copyError.message },
            { status: 500 }
          );
        }

        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove([filePath]);
        if (removeError) {
          console.error("invoices approve remove tmp error:", removeError);
        }

        updates.file_path = destPath;
        updates.file_name = fileName;
      }
    }

    const { data: row, error } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("invoices review error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    if (!row) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoiceRowToInvoice(row as InvoiceRow),
    });
  } catch (err) {
    console.error("invoices [id] review POST error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
