/**
 * Chatwork API: ルームにメッセージを投稿する。
 * CHATWORK_API_TOKEN または roomId が未設定の場合は何もしない。
 */

const CHATWORK_API_BASE = "https://api.chatwork.com/v2";

export interface SendMessageOptions {
  /** ルームID */
  roomId: string;
  /** メッセージ本文 */
  body: string;
  /** To メンションするアカウントIDの配列。指定時は本文先頭に [To:id] を付与 */
  toAccountIds?: number[];
}

/**
 * 指定ルームにメッセージを投稿する。
 * 環境変数 CHATWORK_API_TOKEN が無い場合は送信せずに return する。
 */
export async function sendMessageToRoom(
  options: SendMessageOptions
): Promise<void> {
  const token = process.env.CHATWORK_API_TOKEN;
  const { roomId, body, toAccountIds } = options;

  if (!token || !roomId) {
    return;
  }

  let messageBody = body;
  if (toAccountIds?.length) {
    const toPrefix = toAccountIds.map((id) => `[To:${id}]`).join("");
    messageBody = `${toPrefix}\n\n${body}`;
  }

  const form = new URLSearchParams({ body: messageBody });
  const res = await fetch(`${CHATWORK_API_BASE}/rooms/${roomId}/messages`, {
    method: "POST",
    headers: {
      "X-ChatWorkToken": token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chatwork API error ${res.status}: ${text}`);
  }
}

const DASHBOARD_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
    : "https://tmg-settlement.vercel.app";
const DASHBOARD_URL = `${DASHBOARD_BASE}/dashboard`;

/**
 * 請求書経理提出時の通知メッセージ本文を組み立てる。
 * partnerName: 売掛のときは請求先、買掛・領収書のときは請求元
 */
export function buildInvoiceSubmittedMessage(params: {
  partnerName: string;
  targetMonth: string;
  submitterName: string;
}): string {
  const { partnerName, targetMonth, submitterName } = params;
  return [
    "【請求書提出通知】",
    `取引先: ${partnerName}`,
    `対象月: ${targetMonth}`,
    `提出者: ${submitterName}`,
    `確認: ${DASHBOARD_URL}`,
  ].join("\n");
}

/**
 * 請求書差し戻し時の通知メッセージ本文を組み立てる。
 * shortId でダッシュボード該当請求書へのリンクを付与。
 */
export function buildInvoiceReturnedMessage(params: {
  shortId: string;
  partnerName: string;
  targetMonth: string;
  submitterName: string;
  reviewerComment: string | null;
}): string {
  const { shortId, partnerName, targetMonth, submitterName, reviewerComment } =
    params;
  const lines = [
    "【請求書差し戻し】",
    `請求書ID: ${shortId}`,
    `取引先: ${partnerName}`,
    `対象月: ${targetMonth}`,
    `担当者: ${submitterName}`,
  ];
  if (reviewerComment?.trim()) {
    lines.push(`差し戻し理由: ${reviewerComment.trim()}`);
  }
  lines.push(`確認: ${DASHBOARD_BASE}/dashboard?id=${shortId}`);
  return lines.join("\n");
}
