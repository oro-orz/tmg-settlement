import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  HumanCheckedItems,
  Invoice,
  InvoiceAiResult,
  InvoiceStatus,
} from "@/lib/types";

/** 承認履歴テーブルの型（Supabase の Row） */
export interface ApprovalHistoryRow {
  id: string;
  application_id: string;
  action: string;
  checker: string;
  comment: string | null;
  created_at: string;
}

/** サーバー専用 Supabase クライアント（service_role）。API ルート・Server Components で使用 */
export function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  return createClient(url, key);
}

/** invoices テーブルの行（snake_case） */
export interface InvoiceRow {
  id: string;
  submitter_name: string;
  vendor_name: string;
  email: string;
  target_month: string;
  file_path: string | null;
  status: string;
  type: string;
  file_name: string | null;
  ai_result: unknown;
  human_checked: unknown;
  reviewer_comment: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
}

/** InvoiceRow をフロント用の Invoice 型に変換 */
export function invoiceRowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    submitterName: row.submitter_name,
    vendorName: row.vendor_name,
    email: row.email,
    targetMonth: row.target_month,
    filePath: row.file_path,
    status: row.status as InvoiceStatus,
    type: (row.type === "payment" ? "payment" : row.type === "receipt" ? "receipt" : "received") as Invoice["type"],
    fileName: row.file_name ?? null,
    aiResult: row.ai_result as InvoiceAiResult | null,
    humanChecked: row.human_checked as HumanCheckedItems | null,
    reviewerComment: row.reviewer_comment,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  };
}
