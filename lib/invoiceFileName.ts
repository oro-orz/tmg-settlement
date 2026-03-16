/**
 * Storageパス・オブジェクトキーに使えない文字を除去（Supabase Storage の Invalid key を防ぐ）
 * スペース・スラッシュ・バックスラッシュ・制御文字などをアンダースコアに置換
 */
export function sanitize(name: string): string {
  return name
    .replace(/[/\\:*?"<>|\s]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim() || "_";
}

/**
 * ストレージキー用: 英数字・ハイフン・アンダースコアのみにし、Supabase の Invalid key を防ぐ（フォルダ・ファイル名の両方で使用）
 */
export function storageSafeSlug(name: string): string {
  const s = sanitize(name)
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || "vendor";
}

/**
 * 受取請求書のストレージ用ファイル名（ASCII のみ。Supabase Invalid key 対策）
 * 例: "invoice_Hoshino_Design_2026-02.pdf"
 */
export function buildInvoiceFileName(
  vendorName: string,
  targetMonth: string,
  version?: number
): string {
  const suffix = version && version > 1 ? `_v${version}` : "";
  return `invoice_${storageSafeSlug(vendorName)}_${targetMonth}${suffix}.pdf`;
}

/**
 * 支払い請求書のストレージ用ファイル名（ASCII のみ。Supabase Invalid key 対策）
 * 例: "payment_Hoshino_Design_2026-02.pdf"
 */
export function buildPaymentFileName(
  vendorName: string,
  targetMonth: string,
  version?: number
): string {
  const suffix = version && version > 1 ? `_v${version}` : "";
  return `payment_${storageSafeSlug(vendorName)}_${targetMonth}${suffix}.pdf`;
}

/**
 * 領収書のストレージ用ファイル名（ASCII のみ。Supabase Invalid key 対策）
 * 例: "receipt_Hoshino_Design_2026-02.pdf"
 */
export function buildReceiptFileName(
  vendorName: string,
  targetMonth: string,
  version?: number
): string {
  const suffix = version && version > 1 ? `_v${version}` : "";
  return `receipt_${storageSafeSlug(vendorName)}_${targetMonth}${suffix}.pdf`;
}

/**
 * ダウンロード用の表示ファイル名。
 * 売掛(received)は常に請求先名(clientName)から生成（DB の file_name は過去に弊社名で保存されている場合があるため使わない）。
 * 買掛・領収書は DB の file_name があればそれ、なければ取引先・対象月・種別から生成。
 */
export function getInvoiceDownloadFileName(params: {
  fileName: string | null;
  vendorName: string;
  clientName?: string;
  targetMonth: string;
  type: "received" | "payment" | "receipt";
}): string {
  const receivedName = (params.clientName ?? "").trim() || params.vendorName;
  if (params.type === "received") return buildInvoiceFileName(receivedName, params.targetMonth);
  if (params.fileName?.trim()) return params.fileName.trim();
  if (params.type === "payment") return buildPaymentFileName(params.vendorName, params.targetMonth);
  if (params.type === "receipt") return buildReceiptFileName(params.vendorName, params.targetMonth);
  return buildInvoiceFileName(receivedName, params.targetMonth);
}
