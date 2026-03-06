/**
 * "2026-01" → "1月度"
 */
function formatMonth(targetMonth: string): string {
  const month = parseInt(targetMonth.split("-")[1], 10);
  return `${month}月度`;
}

/**
 * Storageパスに使えない文字を除去
 */
export function sanitize(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim();
}

/**
 * 受取請求書のファイル名
 * 例: "株式会社〇〇_1月度請求書.pdf"
 */
export function buildInvoiceFileName(
  vendorName: string,
  targetMonth: string,
  version?: number
): string {
  const suffix = version && version > 1 ? `_v${version}` : "";
  return `${sanitize(vendorName)}_${formatMonth(targetMonth)}請求書${suffix}.pdf`;
}

/**
 * 支払い請求書のファイル名
 * 例: "支払い_株式会社〇〇_1月度請求書.pdf"
 */
export function buildPaymentFileName(
  vendorName: string,
  targetMonth: string,
  version?: number
): string {
  const suffix = version && version > 1 ? `_v${version}` : "";
  return `支払い_${sanitize(vendorName)}_${formatMonth(targetMonth)}請求書${suffix}.pdf`;
}
