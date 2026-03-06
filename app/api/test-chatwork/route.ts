/**
 * 開発時のみ: Chatwork テスト通知を送る。
 * GET /api/test-chatwork → テスト用の【請求書提出通知】をルームに投稿する。
 */
import { NextResponse } from "next/server";
import {
  sendMessageToRoom,
  buildInvoiceSubmittedMessage,
} from "@/lib/chatwork";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, message: "Only available in development" },
      { status: 404 }
    );
  }

  const roomId = process.env.CHATWORK_ROOM_ID ?? "273335165";
  const toIdsRaw = process.env.CHATWORK_TO_IDS ?? "2770625,9991262";
  const toAccountIds = toIdsRaw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));

  try {
    await sendMessageToRoom({
      roomId,
      body: buildInvoiceSubmittedMessage({
        vendorName: "テスト取引先株式会社",
        targetMonth: "2026-03",
        submitterName: "テスト提出者",
      }),
      toAccountIds: toAccountIds.length ? toAccountIds : undefined,
    });
    return NextResponse.json({
      success: true,
      message: "Chatwork にテスト通知を送信しました。",
    });
  } catch (err) {
    console.error("test-chatwork error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "送信に失敗しました",
      },
      { status: 500 }
    );
  }
}
