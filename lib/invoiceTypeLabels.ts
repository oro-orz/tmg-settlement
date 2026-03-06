import type { InvoiceType } from "@/lib/types";

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
