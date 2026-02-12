import { NextRequest, NextResponse } from "next/server";

/**
 * 休暇申請の承認状態を更新（拠点長・役員・労務確認）。休暇申請用GASへプロキシ。
 */
export async function POST(request: NextRequest) {
  const gasUrl = process.env.NEXT_PUBLIC_LEAVE_GAS_API_URL;
  if (!gasUrl) {
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_LEAVE_GAS_API_URL is not defined" },
      { status: 500 }
    );
  }

  let body: { rowIndex?: number; column?: string; value?: string | boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { rowIndex, column, value } = body;
  if (rowIndex == null || !column || value === undefined || value === null) {
    return NextResponse.json(
      { success: false, message: "rowIndex, column, value が必要です" },
      { status: 400 }
    );
  }

  const payload = {
    action: "leave_approval",
    rowIndex: Number(rowIndex),
    column,
    value,
  };

  try {
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!text || !text.trim().startsWith("{")) {
      return NextResponse.json(
        { success: false, message: "休暇申請GASから不正な応答がありました" },
        { status: 502 }
      );
    }
    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Leave approval proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update leave approval",
      },
      { status: 502 }
    );
  }
}
