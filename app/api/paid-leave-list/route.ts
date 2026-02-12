import { NextResponse } from "next/server";

/**
 * 休暇申請用GASの有給残数一覧をプロキシ（CORS回避）
 */
export async function GET() {
  const gasUrl = process.env.NEXT_PUBLIC_LEAVE_GAS_API_URL;
  if (!gasUrl) {
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_LEAVE_GAS_API_URL is not defined" },
      { status: 500 }
    );
  }

  const url = `${gasUrl.replace(/\/$/, "")}?action=leave_approval&method=getPaidLeaveList`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
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
    console.error("Paid leave list proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch paid leave list",
      },
      { status: 502 }
    );
  }
}
