import { createHash } from "node:crypto";

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

/** 日本語のみの名前用: 8文字の短いハッシュで一意化（同じ会社名は同じフォルダになる） */
function shortHash(str: string): string {
  return createHash("sha256").update(str, "utf8").digest("hex").slice(0, 8);
}

/**
 * ストレージキー用: 英数字・ハイフン・アンダースコアのみにし、Supabase の Invalid key を防ぐ（フォルダ・ファイル名の両方で使用）
 * 日本語のみの会社名の場合は vendor_xxxxxxxx（名前のハッシュ）になり、社ごとに別フォルダになる
 */
export function storageSafeSlug(name: string): string {
  const s = sanitize(name)
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (s) return s;
  return "vendor_" + shortHash(name);
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

/**
 * ダウンロード用ファイル名に使う文字のみ許可（/ \ : * ? " < > | を _ に）。日本語はそのまま。
 */
function sanitizeForDownloadFileName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "_";
}

/** target_month "2026-02" → "2026年2"（後ろに「月度」を付けて「2026年2月度」にする用） */
function formatMonthLabel(targetMonth: string): string {
  const m = (targetMonth || "").trim();
  if (!m) return "";
  const [y, month] = m.split("-");
  if (!y || !month) return m;
  const monthNum = parseInt(month, 10);
  if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) return m;
  return `${y}年${monthNum}`;
}

/**
 * ダウンロード用の日本語ファイル名（Content-Disposition filename*=UTF-8 で使用）。
 * 買掛: 支払い_取引先名_○月月度請求書 / 売掛: 請求先名_○月月度請求書 / 領収書: 支払い済み_取引先名_○月月度領収書
 */
export function getInvoiceDownloadFileNameJapanese(params: {
  vendorName: string;
  clientName?: string;
  targetMonth: string;
  type: "received" | "payment" | "receipt";
}): string {
  const company = sanitizeForDownloadFileName(params.vendorName || "");
  const receivedName = sanitizeForDownloadFileName(
    (params.clientName ?? "").trim() || params.vendorName || ""
  );
  const monthLabel = formatMonthLabel(params.targetMonth);

  switch (params.type) {
    case "payment":
      return `支払い_${company}_${monthLabel}月度請求書.pdf`;
    case "receipt":
      return `支払い済み_${company}_${monthLabel}月度領収書.pdf`;
    case "received":
    default:
      return `${receivedName}_${monthLabel}月度請求書.pdf`;
  }
}
