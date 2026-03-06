import { NextRequest, NextResponse } from "next/server";
import { extractAndCheckInvoicePdf } from "@/lib/invoiceAiChecker";

/** POST: PDF のみで請求元名・請求月を抽出しつつ AI チェック（DB には保存しない） */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfBase64 } = body;

    if (!pdfBase64) {
      return NextResponse.json(
        { success: false, message: "pdfBase64 は必須です" },
        { status: 400 }
      );
    }

    const base64 = String(pdfBase64).replace(/^data:application\/pdf;base64,/, "");

    const result = await extractAndCheckInvoicePdf(base64);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("invoices extract-and-check error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
