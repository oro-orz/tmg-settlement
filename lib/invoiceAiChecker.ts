import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  InvoiceAiResult,
  InvoiceCheckItem,
  InvoiceAttentionItem,
  InvoiceExtractResult,
} from "@/lib/types";

const GEMINI_MODEL = "gemini-2.0-flash";

const PROMPT = `あなたは経理担当者のアシスタントです。この請求書（PDF）を分析し、以下のチェック項目を判定してください。

【前提（判定時に考慮すること）】
- 請求は「前月末締め・当月月初に請求書送付」が一般的です。そのため、請求書の発行日や請求日が「対象月の翌月」（例: 1月分の請求書が2月に発行）であっても問題ありません。
- 支払期限は「提出日（請求日）の当月末」であればOKです。例: 2月に請求書を出した場合、支払期限が2月末日で問題ありません。翌月末も可。±7日程度のばらつき可。
- 当月末払いの場合、提出日（請求日）と支払期限が同日（当月末日）になることがあり、その場合は問題ありません。

【チェック 8項目】
1. payerAndAccountMatch: 請求者名と口座名義の表記が一致しているか
2. targetMonthLabel: 請求対象月の表記が正しいか（タイトルと明細内の月表記を照合）
3. issueDateInFollowingMonth: 発行日が対象月の翌月中か。翌月1日〜末日であればOK。対象月中の発行もOK。翌々月以降はNG。
4. billingDateInFollowingMonth: 請求日が対象月の翌月か。1月分であれば請求日が2月中であることを確認。翌々月以降はNG。
5. hasPaymentDue: 支払期限が記載されているか
6. paymentDueNextMonthEnd: 支払期限が提出日（請求日）の当月末または翌月末か（±7日許容）。当月末払いで提出日=支払期限が同日になる場合もOKとする。
7. hasItemDescription: 商材名・サービス内容が記載されているか
8. withholdingTaxCorrect: 源泉所得税の計算が正しいか（税抜×10.21%で検算）。源泉税の記載がない場合は「対象外（免税事業者の可能性あり）」としてOKとする。

【留意チェック 5項目（記載有無のみAI判定・内容は後で人間が目視）】
1. bankBranch: 銀行名・支店名が記載されているか
2. accountName: 口座名義が記載されているか
3. invoiceNumber: インボイス登録番号（T + 13桁）が記載されているか。個人事業主・免税事業者の場合は番号がないケースがあるため、記載なしでも warningOnly: true（NGではなく警告）として返すこと。
4. legalName: 法人名の正式表記が記載されているか
5. submitterName: 請求者名が記載されているか（誤字・表記ゆれは人間が確認）

以下のJSON形式のみで回答してください（JSON以外は出力しないでください）：
{
  "checks": [
    { "id": "payerAndAccountMatch", "label": "請求者名と口座名義の一致", "ok": true/false, "reason": "理由" },
    { "id": "targetMonthLabel", "label": "請求対象月の表記が正しいか", "ok": true/false, "reason": "理由" },
    { "id": "issueDateInFollowingMonth", "label": "発行日が対象月の翌月中か", "ok": true/false, "reason": "理由" },
    { "id": "billingDateInFollowingMonth", "label": "請求日が対象月の翌月か", "ok": true/false, "reason": "理由" },
    { "id": "hasPaymentDue", "label": "支払期限の記載", "ok": true/false, "reason": "理由" },
    { "id": "paymentDueNextMonthEnd", "label": "支払期限が請求月の当月末または翌月末か（同日OK）", "ok": true/false, "reason": "理由" },
    { "id": "hasItemDescription", "label": "商材名・サービス内容の記載", "ok": true/false, "reason": "理由" },
    { "id": "withholdingTaxCorrect", "label": "源泉所得税の計算が正しいか", "ok": true/false, "reason": "理由" }
  ],
  "attention": [
    { "id": "bankBranch", "label": "銀行名・支店名", "hasValue": true/false, "reason": "理由（記載なし時）" },
    { "id": "accountName", "label": "口座名義", "hasValue": true/false, "reason": "理由" },
    { "id": "invoiceNumber", "label": "インボイス登録番号", "hasValue": true/false, "warningOnly": true/false, "reason": "理由" },
    { "id": "legalName", "label": "法人名の正式表記", "hasValue": true/false, "reason": "理由" },
    { "id": "submitterName", "label": "請求者名", "hasValue": true/false, "reason": "理由" }
  ],
  "findings": ["検出事項1", "検出事項2"],
  "recommendation": "要確認 など短文（問題なければ空文字）",
  "confidence": 0.0〜1.0
}`;

const EXTRACT_AND_CHECK_PROMPT = `あなたは経理担当者のアシスタントです。この請求書（PDF）を分析してください。

【前提】
- 請求は「前月末締め・当月月初に請求書送付」が一般的です。発行日が対象月の翌月（例: 1月分が2月発行）でも問題ありません。
- 支払期限は「提出日（請求日）の当月末」であればOK。例: 2月請求なら支払期限2月末で可。翌月末も可（±7日程度可）。
- 当月末払いでは提出日と支払期限が同日（当月末日）になることがあり、その場合はOKとする。

【ステップ1】まず請求書から以下を抽出してください。
- extractedVendorName: 請求元名（会社名）。個人の請求の場合は請求者名（個人名）。
- extractedTargetMonth: 請求対象月を YYYY-MM 形式で（例: 2026-02）。

【ステップ2】抽出した対象月（extractedTargetMonth）を使って、以下の8項目と留意5項目を判定してください。

【チェック 8項目】
1. payerAndAccountMatch: 請求者名と口座名義の表記が一致しているか
2. targetMonthLabel: 請求対象月の表記が正しいか（タイトルと明細内の月表記を照合）
3. issueDateInFollowingMonth: 発行日が対象月の翌月中か。翌月1日〜末日であればOK。対象月中の発行もOK。翌々月以降はNG。
4. billingDateInFollowingMonth: 請求日が対象月の翌月か。1月分であれば請求日が2月中であることを確認。翌々月以降はNG。
5. hasPaymentDue: 支払期限が記載されているか
6. paymentDueNextMonthEnd: 支払期限が提出日（請求日）の当月末または翌月末か（±7日許容）。当月末払いで提出日=支払期限が同日になる場合もOKとする。
7. hasItemDescription: 商材名・サービス内容が記載されているか
8. withholdingTaxCorrect: 源泉所得税の計算が正しいか（税抜×10.21%で検算）。源泉税の記載がない場合は「対象外（免税事業者の可能性あり）」としてOKとする。

【留意チェック 5項目（記載有無のみ）】
1. bankBranch: 銀行名・支店名が記載されているか
2. accountName: 口座名義が記載されているか
3. invoiceNumber: インボイス登録番号（T + 13桁）が記載されているか。個人事業主・免税事業者の場合は番号がないケースがあるため、記載なしでも warningOnly: true（NGではなく警告）として返すこと。
4. legalName: 法人名の正式表記が記載されているか
5. submitterName: 請求者名が記載されているか

以下のJSON形式のみで回答してください（JSON以外は出力しないでください）：
{
  "extractedVendorName": "抽出した請求元名または個人名",
  "extractedTargetMonth": "YYYY-MM",
  "checks": [
    { "id": "payerAndAccountMatch", "label": "請求者名と口座名義の一致", "ok": true/false, "reason": "理由" },
    { "id": "targetMonthLabel", "label": "請求対象月の表記が正しいか", "ok": true/false, "reason": "理由" },
    { "id": "issueDateInFollowingMonth", "label": "発行日が対象月の翌月中か", "ok": true/false, "reason": "理由" },
    { "id": "billingDateInFollowingMonth", "label": "請求日が対象月の翌月か", "ok": true/false, "reason": "理由" },
    { "id": "hasPaymentDue", "label": "支払期限の記載", "ok": true/false, "reason": "理由" },
    { "id": "paymentDueNextMonthEnd", "label": "支払期限が請求月の当月末または翌月末か（同日OK）", "ok": true/false, "reason": "理由" },
    { "id": "hasItemDescription", "label": "商材名・サービス内容の記載", "ok": true/false, "reason": "理由" },
    { "id": "withholdingTaxCorrect", "label": "源泉所得税の計算が正しいか", "ok": true/false, "reason": "理由" }
  ],
  "attention": [
    { "id": "bankBranch", "label": "銀行名・支店名", "hasValue": true/false, "reason": "理由" },
    { "id": "accountName", "label": "口座名義", "hasValue": true/false, "reason": "理由" },
    { "id": "invoiceNumber", "label": "インボイス登録番号", "hasValue": true/false, "warningOnly": true/false, "reason": "理由" },
    { "id": "legalName", "label": "法人名の正式表記", "hasValue": true/false, "reason": "理由" },
    { "id": "submitterName", "label": "請求者名", "hasValue": true/false, "reason": "理由" }
  ],
  "findings": ["検出事項1"],
  "recommendation": "要確認 など短文（問題なければ空文字）",
  "confidence": 0.0〜1.0
}`;

function buildContext(targetMonth: string): string {
  return `【対象年月】${targetMonth}\n\n${PROMPT}`;
}

function defaultFallback(processingTime: number): InvoiceAiResult {
  return {
    checks: [],
    attention: [],
    allChecksOk: false,
    findings: ["AI処理中にエラーが発生しました。手動で確認してください。"],
    recommendation: "手動確認が必要です",
    confidence: 0,
    processingTime,
  };
}

export async function checkInvoicePdf(
  pdfBase64: string,
  targetMonth: string,
  options?: { model?: string }
): Promise<InvoiceAiResult> {
  const startTime = Date.now();
  const fallback = () => defaultFallback(Date.now() - startTime);

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return fallback();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = options?.model ?? GEMINI_MODEL;
    const model = genAI.getGenerativeModel({ model: modelName });
    const textPart = buildContext(targetMonth);

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
      { text: textPart },
    ]);

    const response = result.response;
    const text = response.text();
    if (!text) {
      return fallback();
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback();
    }

    const raw = JSON.parse(jsonMatch[0]) as {
      checks?: Array<{ id: string; label: string; ok: boolean; reason?: string }>;
      attention?: Array<{ id: string; label: string; hasValue: boolean; warningOnly?: boolean; reason?: string }>;
      findings?: string[];
      recommendation?: string;
      confidence?: number;
    };

    const checks: InvoiceCheckItem[] = Array.isArray(raw.checks)
      ? raw.checks.map((c) => ({
          id: String(c.id ?? ""),
          label: String(c.label ?? ""),
          ok: Boolean(c.ok),
          reason: c.reason ? String(c.reason) : undefined,
        }))
      : [];

    const attention: InvoiceAttentionItem[] = Array.isArray(raw.attention)
      ? raw.attention.map((a) => ({
          id: String(a.id ?? ""),
          label: String(a.label ?? ""),
          hasValue: Boolean(a.hasValue),
          warningOnly: a.warningOnly === true,
          reason: a.reason ? String(a.reason) : undefined,
        }))
      : [];

    const allChecksOk =
      checks.length === 8 && checks.every((c) => c.ok);
    const parsed: InvoiceAiResult = {
      checks,
      attention,
      allChecksOk,
      findings: Array.isArray(raw.findings) ? raw.findings : [],
      recommendation: typeof raw.recommendation === "string" ? raw.recommendation : "",
      confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
      processingTime: Date.now() - startTime,
    };

    return parsed;
  } catch (error) {
    console.error("Invoice Gemini check failed:", error);
    return fallback();
  }
}

/** PDF から請求元名・請求月を抽出しつつ 9項目＋留意5項目をチェック（アップロード前プレビュー用） */
export async function extractAndCheckInvoicePdf(
  pdfBase64: string,
  options?: { model?: string }
): Promise<InvoiceExtractResult> {
  const startTime = Date.now();
  const fallback = (): InvoiceExtractResult => ({
    vendorName: "",
    targetMonth: "",
    aiResult: defaultFallback(Date.now() - startTime),
  });

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return fallback();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = options?.model ?? GEMINI_MODEL;
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
      { text: EXTRACT_AND_CHECK_PROMPT },
    ]);

    const response = result.response;
    const text = response.text();
    if (!text) {
      return fallback();
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback();
    }

    const raw = JSON.parse(jsonMatch[0]) as {
      extractedVendorName?: string;
      extractedTargetMonth?: string;
      checks?: Array<{ id: string; label: string; ok: boolean; reason?: string }>;
      attention?: Array<{ id: string; label: string; hasValue: boolean; warningOnly?: boolean; reason?: string }>;
      findings?: string[];
      recommendation?: string;
      confidence?: number;
    };

    const vendorName = typeof raw.extractedVendorName === "string"
      ? String(raw.extractedVendorName).trim()
      : "";
    let targetMonth = typeof raw.extractedTargetMonth === "string"
      ? String(raw.extractedTargetMonth).trim().slice(0, 7)
      : "";
    if (targetMonth && !/^\d{4}-\d{2}$/.test(targetMonth)) {
      targetMonth = "";
    }

    const checks: InvoiceCheckItem[] = Array.isArray(raw.checks)
      ? raw.checks.map((c) => ({
          id: String(c.id ?? ""),
          label: String(c.label ?? ""),
          ok: Boolean(c.ok),
          reason: c.reason ? String(c.reason) : undefined,
        }))
      : [];

    const attention: InvoiceAttentionItem[] = Array.isArray(raw.attention)
      ? raw.attention.map((a) => ({
          id: String(a.id ?? ""),
          label: String(a.label ?? ""),
          hasValue: Boolean(a.hasValue),
          warningOnly: a.warningOnly === true,
          reason: a.reason ? String(a.reason) : undefined,
        }))
      : [];

    const allChecksOk = checks.length === 8 && checks.every((c) => c.ok);
    const aiResult: InvoiceAiResult = {
      checks,
      attention,
      allChecksOk,
      findings: Array.isArray(raw.findings) ? raw.findings : [],
      recommendation: typeof raw.recommendation === "string" ? raw.recommendation : "",
      confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
      processingTime: Date.now() - startTime,
    };

    return { vendorName, targetMonth, aiResult };
  } catch (error) {
    console.error("Invoice extract+check failed:", error);
    return fallback();
  }
}
