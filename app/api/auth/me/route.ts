/**
 * GET /api/auth/me
 * セッションを検証し、ログイン中ならユーザー情報を返す。
 * can_approve_invoice: 請求書の承認・差し戻しが可能か（役員・経理）
 */
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, getSessionCookieName } from "@/lib/session";
import { canApproveInvoice, getInvoiceApproverDepartments, getInvoiceApproverRoles, getInvoiceApproverEmails } from "@/lib/auth-config";

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
  const canApprove = canApproveInvoice(session);
  const user: Record<string, unknown> = {
    uid: session.uid,
    email: session.email,
    name: session.name,
    tmg_email: session.tmg_email,
    employee_number: session.employee_number,
    department: session.department,
    role: session.role,
    can_approve_invoice: canApprove,
  };
  // 開発時: 承認判定の確認用（所属・役職が設定と一致しているか確認しやすくする）
  if (process.env.NODE_ENV === "development") {
    user._debug_invoice_approver = {
      your_department: session.department ?? "(空)",
      your_role: session.role ?? "(空)",
      your_email: session.email ?? "(空)",
      allowed_departments: getInvoiceApproverDepartments(),
      allowed_roles: getInvoiceApproverRoles(),
      allowed_emails: getInvoiceApproverEmails(),
    };
  }
  return NextResponse.json({ user });
}
