/**
 * GET /api/auth/me
 * セッションを検証し、ログイン中ならユーザー情報を返す。
 * can_approve_invoice: 請求書の承認・差し戻しが可能か（役員・経理）
 */
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, getSessionCookieName } from "@/lib/session";
import { canApproveInvoice } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      uid: session.uid,
      email: session.email,
      name: session.name,
      tmg_email: session.tmg_email,
      employee_number: session.employee_number,
      department: session.department,
      role: session.role,
      can_approve_invoice: canApproveInvoice(session),
    },
  });
}
