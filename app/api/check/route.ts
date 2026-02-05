import { NextRequest, NextResponse } from "next/server";

/**
 * GAS の submitCheck をプロキシ（CORS 回避）
 */
export async function POST(request: NextRequest) {
  const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
  if (!gasUrl) {
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_GAS_API_URL is not defined" },
      { status: 500 }
    );
  }

  let body: {
    applicationId?: string;
    action?: string;
    checker?: string;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { applicationId, action, checker, comment } = body;
  if (!applicationId || !action || !checker) {
    return NextResponse.json(
      { success: false, message: "Missing applicationId, action, or checker" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    action: "api",
    method: "submitCheck",
    applicationId,
    checkAction: action,
    checker,
  });
  if (comment) params.set("comment", comment);

  const url = `${gasUrl}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "GAS request failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Check proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to submit check",
      },
      { status: 502 }
    );
  }
}
