/**
 * POST /api/auth/session
 * Body: { idToken: string }
 * - トークン検証 → 社員取得 → 許可判定 → 許可時のみセッション Cookie を設定して 200、不許可時は 403 と code を返す。
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { getEmployeeByGoogleEmail } from "@/lib/bigquery-employee";
import { isLoginAllowed, getAllowedEmails } from "@/lib/auth-config";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const AUTH_ERROR_CODES = {
  EMPLOYEE_NOT_FOUND: "EMPLOYEE_NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
} as const;

/** BigQuery 未設定時用の仮の社員情報（ALLOWED_LOGIN_EMAILS のメールのみログイン可） */
function createDevEmployee(
  email: string,
  displayName?: string
): {
  employee_number: string;
  name: string;
  department: string;
  role: string;
  tmg_email: string;
  google_email: string | null;
} {
  const name = displayName ?? email.split("@")[0] ?? "開発用";
  return {
    employee_number: "",
    name,
    department: "",
    role: "",
    tmg_email: email,
    google_email: email,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken =
      typeof body?.idToken === "string" ? body.idToken.trim() : "";
    if (!idToken) {
      return NextResponse.json(
        { code: "INVALID_REQUEST", message: "idToken is required" },
        { status: 400 }
      );
    }

    const decoded = await verifyIdToken(idToken);
    const email = decoded.email ?? "";
    if (!email) {
      return NextResponse.json(
        { code: AUTH_ERROR_CODES.EMPLOYEE_NOT_FOUND, message: "Email not in token" },
        { status: 403 }
      );
    }

    let employee = await getEmployeeByGoogleEmail(email).catch(() => null);
    if (!employee && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json(
        {
          code: AUTH_ERROR_CODES.EMPLOYEE_NOT_FOUND,
          message: "登録外のGmailからのログインはできません",
        },
        { status: 403 }
      );
    }
    if (!employee) {
      const allowedEmails = getAllowedEmails();
      if (allowedEmails.length === 0) {
        return NextResponse.json(
          {
            code: "INTERNAL_ERROR",
            message:
              "BigQuery 未設定時は .env.local に ALLOWED_LOGIN_EMAILS=あなたのGmail を設定してください（複数はカンマ区切り）。",
          },
          { status: 500 }
        );
      }
      if (!allowedEmails.includes(email.toLowerCase().trim())) {
        return NextResponse.json(
          {
            code: AUTH_ERROR_CODES.FORBIDDEN,
            message: "このメールアドレスはログイン許可リストにありません。ALLOWED_LOGIN_EMAILS を確認してください。",
          },
          { status: 403 }
        );
      }
      employee = createDevEmployee(email, (decoded as { name?: string }).name);
    }

    if (!isLoginAllowed(employee, email)) {
      return NextResponse.json(
        {
          code: AUTH_ERROR_CODES.FORBIDDEN,
          message: "権限がないためログインできません",
        },
        { status: 403 }
      );
    }

    const token = await createSessionToken({
      uid: decoded.uid,
      email,
      name: employee.name,
      tmg_email: employee.tmg_email || undefined,
      employee_number: employee.employee_number || undefined,
      department: employee.department || undefined,
      role: employee.role || undefined,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
    return response;
  } catch (e) {
    const errCast = e as { code?: string; message?: string };
    if (errCast?.code === "auth/id-token-expired") {
      return NextResponse.json(
        { code: "TOKEN_EXPIRED", message: "Token expired" },
        { status: 401 }
      );
    }
    console.error("[auth/session]", e);

    const msg = errCast?.message ?? (e instanceof Error ? e.message : String(e));
    if (
      msg.includes("FIREBASE_SERVICE_ACCOUNT") ||
      msg.includes("firebase-admin") ||
      msg.includes("credential")
    ) {
      return NextResponse.json(
        {
          code: "INTERNAL_ERROR",
          message:
            "Firebase Admin の設定を確認してください。.env.local に FIREBASE_SERVICE_ACCOUNT_KEY または FIREBASE_SERVICE_ACCOUNT_KEY_PATH を設定し、開発サーバーを再起動してください。",
        },
        { status: 500 }
      );
    }
    if (
      msg.includes("GOOGLE_SERVICE_ACCOUNT") ||
      msg.includes("BIGQUERY") ||
      msg.includes("BigQuery")
    ) {
      return NextResponse.json(
        {
          code: "INTERNAL_ERROR",
          message:
            "BigQuery / 社員マスタの設定を確認してください。.env.local に GOOGLE_SERVICE_ACCOUNT_KEY, BIGQUERY_PROJECT_ID, BIGQUERY_DATASET_ID 等を設定し、開発サーバーを再起動してください。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
