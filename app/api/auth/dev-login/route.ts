/**
 * 開発用ログイン（Firebase スキップ）。
 * DEV_SKIP_FIREBASE_AUTH=true かつ ALLOWED_LOGIN_EMAILS に含まれるメールのみ許可。
 * 本番では DEV_SKIP_FIREBASE_AUTH を設定しないこと。
 */
import { NextRequest, NextResponse } from "next/server";
import { getAllowedEmails } from "@/lib/auth-config";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "開発用ログインは本番では利用できません" },
      { status: 403 }
    );
  }
  // 開発時は DEV_SKIP_FIREBASE_AUTH がなくても許可（NODE_ENV=development のみ）
  const devAllowed =
    process.env.DEV_SKIP_FIREBASE_AUTH === "true" || process.env.NODE_ENV === "development";
  if (!devAllowed) {
    return NextResponse.json(
      { message: "DEV_SKIP_FIREBASE_AUTH が設定されていません" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json(
      { message: "email を指定してください" },
      { status: 400 }
    );
  }

  const allowed = getAllowedEmails();
  if (allowed.length === 0) {
    return NextResponse.json(
      { message: ".env.local に ALLOWED_LOGIN_EMAILS を設定してください" },
      { status: 500 }
    );
  }
  if (!allowed.includes(email)) {
    return NextResponse.json(
      { message: "このメールアドレスは許可されていません" },
      { status: 403 }
    );
  }

  const token = await createSessionToken({
    uid: "dev-" + email,
    email,
    name: email.split("@")[0] ?? "開発用",
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
  return response;
}
