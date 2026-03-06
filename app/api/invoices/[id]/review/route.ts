import { NextRequest, NextResponse } from "next/server";
import {
  buildInvoiceFileName,
  buildPaymentFileName,
  sanitize,
} from "@/lib/invoiceFileName";
import { getServerSupabase, invoiceRowToInvoice, type InvoiceRow } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Params = { params: Promise<{ id: string }> };

const BUCKET = "invoices";

/** 同一フォルダ内の重複を避けるファイル名と保存先パスを決定 */
async function resolveFileName(
  supabase: SupabaseClient,
  vendorName: string,
  targetMonth: string,
  isPayment: boolean
): Promise<{ fileName: string; destPath: string }> {
  const safeVendor = sanitize(vendorName);
  const folderPath = `${targetMonth}/${safeVendor}`;
  let version = 1;
  while (true) {
    const fileName = isPayment
      ? buildPaymentFileName(vendorName, targetMonth, version)
      : buildInvoiceFileName(vendorName, targetMonth, version);
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
      .select("id, file_path, vendor_name, target_month, type")
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
        const isPayment = invoice.type === "payment";
        const { fileName, destPath } = await resolveFileName(
          supabase,
          invoice.vendor_name,
          invoice.target_month,
          isPayment
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
