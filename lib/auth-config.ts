/**
 * ログイン許可条件の取得と判定。
 * ALLOWED_LOGIN_EMAILS, ALLOWED_DEPARTMENTS, ALLOWED_ROLE をパースし、
 * 社員情報が条件を満たすか判定する。
 */
import type { EmployeeRow } from "./bigquery-employee";

function parseCsv(envValue: string | undefined): string[] {
  if (!envValue || typeof envValue !== "string") return [];
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 許可メールリスト（小文字で比較用） */
export function getAllowedEmails(): string[] {
  return parseCsv(process.env.ALLOWED_LOGIN_EMAILS).map((e) =>
    e.toLowerCase()
  );
}

/** 許可所属課 */
export function getAllowedDepartments(): string[] {
  return parseCsv(process.env.ALLOWED_DEPARTMENTS);
}

/** 許可権限（役職） */
export function getAllowedRoles(): string[] {
  return parseCsv(process.env.ALLOWED_ROLE);
}

/**
 * 社員がログイン許可条件を満たすか判定する。
 * (department in ALLOWED_DEPARTMENTS) OR (role in ALLOWED_ROLE) OR (email in ALLOWED_LOGIN_EMAILS)
 */
export function isLoginAllowed(employee: EmployeeRow, googleEmail: string): boolean {
  const allowedDepts = getAllowedDepartments();
  const allowedRoles = getAllowedRoles();
  const allowedEmails = getAllowedEmails();
  const emailLower = googleEmail.toLowerCase().trim();

  if (allowedDepts.length > 0 && allowedDepts.includes(employee.department.trim())) {
    return true;
  }
  if (allowedRoles.length > 0 && allowedRoles.includes(employee.role.trim())) {
    return true;
  }
  if (allowedEmails.length > 0 && allowedEmails.includes(emailLower)) {
    return true;
  }
  return false;
}

// --- 請求書承認・役員担当の表示制限 ---

/** 承認可能な所属（経理など）。INVOICE_APPROVER_DEPARTMENTS（未設定時は「経理」） */
export function getInvoiceApproverDepartments(): string[] {
  const v = parseCsv(process.env.INVOICE_APPROVER_DEPARTMENTS);
  return v.length > 0 ? v : ["経理"];
}

/** 承認可能な役職（役員など）。INVOICE_APPROVER_ROLES（未設定時は「役員」） */
export function getInvoiceApproverRoles(): string[] {
  const v = parseCsv(process.env.INVOICE_APPROVER_ROLES);
  return v.length > 0 ? v : ["役員"];
}

/** セッションの所属・役職から「請求書の承認・差し戻し」が可能か */
export function canApproveInvoice(session: {
  department?: string | null;
  role?: string | null;
} | null): boolean {
  if (!session) return false;
  const dept = (session.department ?? "").trim();
  const role = (session.role ?? "").trim();
  const allowedDepts = getInvoiceApproverDepartments();
  const allowedRoles = getInvoiceApproverRoles();
  if (allowedDepts.length > 0 && allowedDepts.includes(dept)) return true;
  if (allowedRoles.length > 0 && allowedRoles.includes(role)) return true;
  return false;
}

/** 役員担当として扱う担当者名のリスト。INVOICE_EXECUTIVE_SUBMITTER_NAMES（カンマ区切り） */
export function getExecutiveSubmitterNames(): string[] {
  return parseCsv(process.env.INVOICE_EXECUTIVE_SUBMITTER_NAMES).map((s) =>
    s.trim()
  );
}

/** 比較用: 空白を正規化（前後trim・連続スペースを1つに） */
function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** 指定の担当者名が役員扱いか（役員担当の請求書は役員・経理のみ表示）。
 * 注意: 非表示にするには INVOICE_EXECUTIVE_SUBMITTER_NAMES に役員の担当者名をカンマ区切りで設定すること。未設定なら誰でも表示される。 */
export function isExecutiveSubmitter(submitterName: string | null | undefined): boolean {
  if (!submitterName || typeof submitterName !== "string") return false;
  const name = normalizeName(submitterName);
  if (!name) return false;
  const list = getExecutiveSubmitterNames();
  if (list.length === 0) return false;
  return list.some((n) => normalizeName(n) === name);
}
