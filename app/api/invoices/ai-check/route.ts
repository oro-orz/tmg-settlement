import { NextRequest, NextResponse } from "next/server";
import { checkInvoicePdf, extractAndCheckInvoicePdf } from "@/lib/invoiceAiChecker";
import { buildInvoiceFileName, buildPaymentFileName, buildReceiptFileName } from "@/lib/invoiceFileName";
import { getServerSupabase } from "@/lib/supabase";
import type { InvoiceRow } from "@/lib/supabase";

/** POST: 請求書 PDF の AI チェック（Gemini）
 * - pdfBase64 + targetMonth: 従来どおり check のみ（1件ずつアップロード後の即時チェック）
 * - invoiceId のみ: pending の請求書を Storage から取得し、抽出＋チェックを実行し DB を更新（表示用 file_name のみ更新、Storage パスは変更しない）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { invoiceId, pdfBase64, targetMonth } = body;

    const supabase = getServerSupabase();

    // パターン2: invoiceId のみ → pending の場合は Storage から取得して extract+check
    if (invoiceId && !pdfBase64) {
      const id = String(invoiceId).trim();
      if (!id) {
        return NextResponse.json(
          { success: false, message: "invoiceId は必須です" },
          { status: 400 }
        );
      }

      const { data: invoice, error: fetchError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !invoice) {
        return NextResponse.json(
          { success: false, message: fetchError?.message ?? "Not found" },
          { status: fetchError?.code === "PGRST116" ? 404 : 500 }
        );
      }

      const row = invoice as InvoiceRow;
      if (row.status !== "pending") {
        return NextResponse.json(
          { success: false, message: "pending の請求書のみ対象です" },
          { status: 400 }
        );
      }

      const filePath = row.file_path;
      if (!filePath) {
        return NextResponse.json(
          { success: false, message: "PDF がアップロードされていません" },
          { status: 400 }
        );
      }

      try {
        await supabase.from("invoices").update({ status: "ai_checking" }).eq("id", id);

        const { data: blob, error: downloadError } = await supabase.storage
          .from("invoices")
          .download(filePath);

        if (downloadError || !blob) {
          await supabase.from("invoices").update({ status: "pending" }).eq("id", id);
          console.error("invoices ai-check storage download error:", downloadError);
          return NextResponse.json(
            { success: false, message: "PDF の取得に失敗しました" },
            { status: 500 }
          );
        }

        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        const extractResult = await extractAndCheckInvoicePdf(base64);
        const { vendorName, targetMonth: extractedMonth, aiResult } = extractResult;

        const isPayment = row.type === "payment";
        const isReceipt = row.type === "receipt";
        const newFileName = isPayment
          ? buildPaymentFileName(vendorName, extractedMonth)
          : isReceipt
            ? buildReceiptFileName(vendorName, extractedMonth)
            : buildInvoiceFileName(vendorName, extractedMonth);

        // Storage のパスはそのまま（tmp/{id}.pdf）。日本語ファイル名は Storage で問題になるため、
        // 表示・ダウンロード用の file_name のみ DB に保存する。
        await supabase
          .from("invoices")
          .update({
            vendor_name: vendorName,
            target_month: extractedMonth,
            file_name: newFileName,
            ai_result: aiResult as unknown as Record<string, unknown>,
            status: aiResult.allChecksOk ? "ai_ok" : "needs_fix",
          })
          .eq("id", id);

        return NextResponse.json({
          success: true,
          data: { vendorName, targetMonth: extractedMonth, aiResult },
        });
      } catch (pendingErr) {
        await supabase.from("invoices").update({ status: "pending" }).eq("id", id);
        throw pendingErr;
      }
    }

    // パターン1: pdfBase64 + targetMonth（従来）
    if (!pdfBase64 || !targetMonth) {
      return NextResponse.json(
        { success: false, message: "pdfBase64 と targetMonth か、または invoiceId のみを指定してください" },
        { status: 400 }
      );
    }

    const base64 = String(pdfBase64).replace(/^data:application\/pdf;base64,/, "");

    if (invoiceId) {
      await supabase.from("invoices").update({ status: "ai_checking" }).eq("id", invoiceId);
    }

    const result = await checkInvoicePdf(base64, String(targetMonth).slice(0, 7));

    if (invoiceId) {
      await supabase
        .from("invoices")
        .update({
          status: result.allChecksOk ? "ai_ok" : "needs_fix",
          ai_result: result as unknown as Record<string, unknown>,
        })
        .eq("id", invoiceId);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("invoices ai-check error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
