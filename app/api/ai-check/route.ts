import { NextRequest, NextResponse } from "next/server";
import { checkReceipt, fetchReceiptAsBase64 } from "@/lib/aiChecker";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { receiptUrl, tool, amount, targetMonth, purpose } = body;

    if (!receiptUrl || tool == null || !targetMonth) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const { base64, mimeType } = await fetchReceiptAsBase64(receiptUrl);

    const result = await checkReceipt(
      base64,
      {
        tool: String(tool),
        amount: Number(amount),
        targetMonth: String(targetMonth),
        purpose: purpose != null ? String(purpose) : "",
      },
      { mimeType }
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI check API error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
