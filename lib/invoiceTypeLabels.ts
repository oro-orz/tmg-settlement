import type { Invoice, InvoiceType } from "@/lib/types";

/** アップロード画面用ラベル（初心者向け） */
export const UPLOAD_TYPE_LABELS: Record<InvoiceType, string> = {
  received: "売上",
  payment: "支払い",
  receipt: "領収書",
};

/** 管理画面用ラベル（経理向け） */
export const MANAGEMENT_TYPE_LABELS: Record<InvoiceType, string> = {
  received: "売掛",
  payment: "買掛",
  receipt: "領収書",
};

/** アップロード画面の種別選択肢 */
export const UPLOAD_TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: "received", label: "売上" },
  { value: "payment", label: "支払い" },
  { value: "receipt", label: "領収書" },
];

export function getUploadTypeLabel(type: InvoiceType): string {
  return UPLOAD_TYPE_LABELS[type] ?? type;
}

export function getManagementTypeLabel(type: InvoiceType): string {
  return MANAGEMENT_TYPE_LABELS[type] ?? type;
}

/** 一覧・詳細で表示する取引先ラベル（種別に応じて請求先 or 請求元） */
export function getPartnerLabel(type: InvoiceType): "請求先" | "請求元" {
  return type === "received" ? "請求先" : "請求元";
}

/** 一覧・詳細で表示する取引先名（売掛＝請求先、買掛・領収書＝請求元） */
export function getDisplayPartnerName(inv: Invoice, fallback?: string): string {
  const fallbackVal = fallback ?? "（AIチェック未実施）";
  if (inv.type === "received") {
    return (inv.clientName || inv.vendorName || inv.fileName || fallbackVal).trim() || fallbackVal;
  }
  return inv.vendorName || inv.fileName || fallbackVal;
}
