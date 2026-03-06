/**
 * ルート保護: /login および静的リソース以外でセッションを検証し、未認証なら /login へリダイレクトする。
 * 請求書アップロード: /upload と POST /api/invoices は認証不要だが、同一IP で 5分あたり 3件までに制限する。
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, getSessionCookieName } from "@/lib/session";

const LOGIN_PATH = "/login";

/** アップロード用レートリミット: 5分あたり最大3件（同一 Edge インスタンス内で有効） */
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const uploadCountByIp = new Map<string, number[]>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isUploadRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = uploadCountByIp.get(ip) ?? [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (valid.length >= RATE_LIMIT_MAX) return true;
  valid.push(now);
  uploadCountByIp.set(ip, valid);
  return false;
}

function isPublicPath(pathname: string): boolean {
  if (pathname === LOGIN_PATH) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/images")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname === "/upload" || pathname.startsWith("/upload/")) return true;
  if (/^\/status\/[^/]+$/.test(pathname)) return true;
  return false;
}

function isPublicApiPath(pathname: string, method: string): boolean {
  if (pathname.startsWith("/api/invoices/status/")) return true;
  if (pathname === "/api/invoices" && method === "POST") return true;
  // 開発時のみ: Chatwork テスト通知（認証なしで curl 可能）
  if (
    process.env.NODE_ENV === "development" &&
    pathname === "/api/test-chatwork" &&
    method === "GET"
  ) {
    return true;
  }
  return false;
}

/** レート制限の対象: 実際の提出（DB保存）のみ。解析（extract-and-check）はカウントしない */
function isUploadRequest(pathname: string, method: string): boolean {
  if (pathname === "/api/invoices" && method === "POST") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (isUploadRequest(pathname, method)) {
    const ip = getClientIp(request);
    if (isUploadRateLimited(ip)) {
      return NextResponse.json(
        { success: false, message: "アップロードの回数が上限に達しました。しばらく経ってからお試しください。" },
        { status: 429 }
      );
    }
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/") && isPublicApiPath(pathname, method)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getSessionCookieName())?.value;
  const isApiRoute = pathname.startsWith("/api/");

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    const res = NextResponse.redirect(url);
    res.cookies.set(getSessionCookieName(), "", { path: "/", maxAge: 0 });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
