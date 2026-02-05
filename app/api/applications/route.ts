import { NextRequest, NextResponse } from "next/server";

/**
 * GAS の getApplications をプロキシ（CORS 回避）
 */
export async function GET(request: NextRequest) {
  try {
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
    if (!gasUrl) {
      return NextResponse.json(
        { success: false, message: "NEXT_PUBLIC_GAS_API_URL is not defined" },
        { status: 500 }
      );
    }

    const month = request?.nextUrl?.searchParams?.get("month") ?? "";
    const gasUrlClean = gasUrl.replace(/\/$/, "");
    const url = `${gasUrlClean}?action=api&method=getApplications${month ? `&month=${encodeURIComponent(month)}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; NextJS-Proxy/1.0)",
      },
      cache: "no-store",
    });
    const text = await res.text();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, message: "GAS から空の応答がありました。" },
        { status: 502 }
      );
    }

    const trimmed = text.trim();
    if (!trimmed.startsWith("{")) {
      console.error("GAS returned non-JSON:", trimmed.slice(0, 300));
      return NextResponse.json(
        {
          success: false,
          message:
            "申請一覧用の GAS が JSON ではなく HTML を返しています。NEXT_PUBLIC_GAS_API_URL には、申請一覧API（getApplications）を含む GAS をデプロイした URL を設定してください（例: gas_merged_code.gs をデプロイした URL）。HTML だけ返すデプロイの URL は使えません。デプロイで「アクセスできるユーザー：全員」にし、必要ならブラウザで一度その URL を開いて認証してください。",
        },
        { status: 502 }
      );
    }

    let data: { success: boolean; message?: string; data?: unknown[] };
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, message: "GAS の応答の解析に失敗しました。" },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "GAS request failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Applications proxy error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch applications";
    return NextResponse.json(
      { success: false, message: "APIエラー: " + message },
      { status: 502 }
    );
  }
}
