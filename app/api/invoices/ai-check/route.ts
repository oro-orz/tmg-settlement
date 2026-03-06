import { NextRequest, NextResponse } from "next/server";
import { checkInvoicePdf } from "@/lib/invoiceAiChecker";
import { getServerSupabase } from "@/lib/supabase";

/** POST: 請求書 PDF の AI チェック（Gemini） */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, pdfBase64, targetMonth } = body;

    if (!pdfBase64 || !targetMonth) {
      return NextResponse.json(
        { success: false, message: "pdfBase64 と targetMonth は必須です" },
        { status: 400 }
      );
    }

    const base64 = String(pdfBase64).replace(/^data:application\/pdf;base64,/, "");

    const supabase = getServerSupabase();
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
