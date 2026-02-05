import { NextRequest, NextResponse } from "next/server";
import { getImage } from "@/lib/gasApi";

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");
  const debug = request.nextUrl.searchParams.get("debug");
  if (!fileId) {
    return NextResponse.json(
      { error: "fileId required" },
      { status: 400 }
    );
  }

  if (debug) {
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
    const diag: string[] = [
      `NEXT_PUBLIC_GAS_API_URL: ${gasUrl ? "設定済み" : "未設定"}`,
      `fileId: ${fileId}`,
    ];
    if (!gasUrl) {
      return new NextResponse(diag.join("\n"), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    try {
      const { base64, mimeType } = await getImage(fileId);
      const len = base64.replace(/\s/g, "").length;
      diag.push(`GAS取得成功: base64長=${len}, mimeType=${mimeType}`);
      return new NextResponse(diag.join("\n"), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch (e) {
      diag.push(`GAS取得エラー: ${e instanceof Error ? e.message : String(e)}`);
      return new NextResponse(diag.join("\n"), {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  try {
    const { base64, mimeType } = await getImage(fileId);
    const base64Clean = base64.replace(/\s/g, "");
    const buffer = Buffer.from(base64Clean, "base64");
    if (buffer.length === 0) {
      console.error("Image API: empty buffer for fileId", fileId);
      return errorResponse(502, "Empty image data");
    }
    const isImage = mimeType && mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";
    const contentType = isImage || isPdf ? mimeType : "image/jpeg";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(buffer.length),
    };
    if (isPdf) {
      headers["Content-Disposition"] = "inline";
    }
    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("Image API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch image";
    return errorResponse(502, message);
  }
}

function errorResponse(status: number, message: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;"><h1>エラー</h1><p>${message}</p><p><a href="/">トップに戻る</a></p></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
