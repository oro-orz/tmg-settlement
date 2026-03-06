"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Invoice, InvoiceExtractResult, InvoiceAiResult } from "@/lib/types";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf, faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";

/** 左パネル（ロゴ・タイトル）＋ 右パネル（コンテンツ）のラッパー */
function UploadLayout({
  children,
  title,
  scrollableRight,
}: {
  children: React.ReactNode;
  title: string;
  /** true のとき右パネルを縦スクロール可能に（プレビュー画面用） */
  scrollableRight?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-[55%] bg-gradient-to-br from-[hsl(262,52%,35%)] via-[hsl(262,48%,42%)] to-[hsl(262,45%,52%)] flex items-center justify-center p-8 lg:p-12 text-white">
        <div className="flex flex-col items-center justify-center text-center">
          <Image
            src="/images/logo_white.png"
            alt=""
            width={140}
            height={36}
            className="h-9 w-auto object-contain"
            priority
          />
          <h1 className="mt-6 text-2xl lg:text-3xl font-bold tracking-tight">
            {title}
          </h1>
        </div>
      </div>
      <div
        className={`flex-1 flex p-6 lg:p-10 bg-background ${
          scrollableRight
            ? "min-h-0 overflow-y-auto items-start justify-center"
            : "items-center justify-center"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type UploadMode = "single" | "bulk";

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>("single");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    extract: InvoiceExtractResult;
    pdfBase64: string;
  } | null>(null);
  const [submitterName, setSubmitterName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [targetMonth, setTargetMonth] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkSubmitterName, setBulkSubmitterName] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkSuccessCount, setBulkSuccessCount] = useState<number | null>(null);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.ok && res.json())
      .then((data) => setIsLoggedIn(Boolean(data?.user)))
      .catch(() => setIsLoggedIn(false));
  }, []);

  const pdfBlobUrl = useMemo(() => {
    if (!preview?.pdfBase64) return null;
    try {
      const binary = atob(preview.pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, [preview?.pdfBase64]);

  const blobUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = pdfBlobUrl;
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    };
  }, [pdfBlobUrl]);

  const handleFile = (f: File | null) => {
    if (f && f.type !== "application/pdf") return;
    setFile(f);
    setError(null);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPreview(null);
    if (!file || file.type !== "application/pdf") {
      setError("PDFを選択してください");
      return;
    }
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/invoices/extract-and-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64: base64 }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message ?? "読み込みに失敗しました");
      }
      const extract = data.data as InvoiceExtractResult;
      setPreview({ extract, pdfBase64: base64 });
      setVendorName(extract.vendorName || "");
      setTargetMonth(extract.targetMonth || "");
      setSubmitterName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    if (!submitterName.trim() || !vendorName.trim() || !targetMonth.trim()) {
      setError("請求元名・担当者名・対象月を入力してください");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: submitterName.trim(),
          vendorName: vendorName.trim(),
          targetMonth: targetMonth.trim().slice(0, 7),
          pdfBase64: preview.pdfBase64,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message ?? "提出に失敗しました");
      }
      const created = data.data as Invoice;
      setInvoice(created);
      await fetch("/api/invoices/ai-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: created.id,
          pdfBase64: preview.pdfBase64,
          targetMonth: created.targetMonth,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setPreview(null);
    setFile(null);
    setInvoice(null);
    setError(null);
    setVendorName("");
    setTargetMonth("");
    setSubmitterName("");
  };

  const handleBulkFiles = (newFiles: FileList | File[]) => {
    const list = Array.from(newFiles).filter((f) => f.type === "application/pdf");
    setBulkFiles((prev) => [...prev, ...list]);
    setError(null);
  };

  const removeBulkFile = (index: number) => {
    setBulkFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSubmitterName.trim()) {
      setError("担当者名を入力してください");
      return;
    }
    if (bulkFiles.length === 0) {
      setError("PDFを1件以上選択してください");
      return;
    }
    setError(null);
    setBulkSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("submitterName", bulkSubmitterName.trim());
      bulkFiles.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/invoices/bulk", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message ?? "一括提出に失敗しました");
      }
      const count = (data.data?.results as { id: string; fileName: string }[])?.length ?? bulkFiles.length;
      setBulkSuccessCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const resetBulkFlow = () => {
    setBulkSuccessCount(null);
    setBulkFiles([]);
    setBulkSubmitterName("");
    setError(null);
  };

  if (invoice) {
    return (
      <UploadLayout title="請求書アップロード">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg shadow-black/5">
          <h2 className="text-xl font-semibold text-foreground mb-2">提出が完了しました</h2>
          <p className="text-body text-muted-foreground mb-6">請求書を登録しました。</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={resetFlow}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-body font-medium hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              もう1件アップロード
            </button>
            <Link
              href={isLoggedIn ? "/dashboard" : "/upload"}
              className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-body font-medium text-center hover:opacity-90 transition-opacity whitespace-nowrap block"
            >
              {isLoggedIn ? "ダッシュボードへ" : "アップロードTOPへ"}
            </Link>
          </div>
        </div>
      </UploadLayout>
    );
  }

  if (bulkSuccessCount !== null) {
    return (
      <UploadLayout title="請求書アップロード">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg shadow-black/5">
          <h2 className="text-xl font-semibold text-foreground mb-2">一括提出が完了しました</h2>
          <p className="text-body text-muted-foreground mb-6">
            {bulkSuccessCount}件を登録しました。ダッシュボードでAIチェックを実行してください。
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={resetBulkFlow}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-body font-medium hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              もう一度一括アップロード
            </button>
            <Link
              href={isLoggedIn ? "/dashboard" : "/upload"}
              className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-body font-medium text-center hover:opacity-90 transition-opacity whitespace-nowrap block"
            >
              {isLoggedIn ? "ダッシュボードへ" : "アップロードTOPへ"}
            </Link>
          </div>
        </div>
      </UploadLayout>
    );
  }

  if (preview) {
    const { extract } = preview;
    const aiResult = extract.aiResult;

    const previewContent = (
      <>
        <div className="min-h-screen flex flex-col lg:flex-row">
          <div className="lg:w-[55%] flex flex-col min-h-[50vh] lg:min-h-0" style={{ backgroundColor: "#3c3c3c" }}>
            <div className="flex-1 min-h-0 p-4 lg:p-6">
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title="請求書"
                  className="w-full h-full min-h-[45vh] lg:min-h-0 rounded-lg bg-white shadow-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white/70">
                  PDFを表示できません
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 flex min-h-0 overflow-y-auto items-start justify-center p-6 lg:p-10 bg-background">
            <div className="w-full max-w-md flex flex-col gap-6 pb-8">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-body font-semibold text-foreground">登録内容</h3>
                <div>
                  <label className="block text-caption text-muted-foreground mb-1">請求元名</label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body"
                    placeholder="会社名・個人名"
                  />
                </div>
                <div>
                  <label className="block text-caption text-muted-foreground mb-1">対象月</label>
                  <input
                    type="month"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body"
                  />
                </div>
                <div>
                  <label className="block text-caption text-muted-foreground mb-1">Timingood担当者名</label>
                  <input
                    type="text"
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body"
                    placeholder="弊社担当者"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-body font-semibold text-foreground mb-3">確認項目</h3>
                <ul className="space-y-2">
                  {(aiResult as InvoiceAiResult).checks?.map((c) => (
                    <li
                      key={c.id}
                      className={`flex items-center gap-2 text-body ${c.ok ? "text-foreground" : "text-destructive"}`}
                    >
                      <span className={c.ok ? "text-green-600" : "text-destructive"}>
                        {c.ok ? "✓" : "✗"}
                      </span>
                      <span>{c.label}</span>
                      {!c.ok && c.reason && (
                        <span className="text-caption text-muted-foreground">({c.reason})</span>
                      )}
                    </li>
                  ))}
                </ul>
                {aiResult.findings?.length > 0 && (
                  <ul className="list-disc list-inside mt-2 text-body text-muted-foreground text-caption">
                    {aiResult.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
                {aiResult.recommendation && (
                  <p className="mt-2 text-caption text-muted-foreground">{aiResult.recommendation}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-body">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetFlow}
                  className="rounded-xl border border-input bg-background px-5 py-2.5 text-body font-medium hover:bg-muted/50"
                >
                  やり直す
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !submitterName.trim() || !vendorName.trim() || !targetMonth.trim()}
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-medium disabled:opacity-50 hover:opacity-90"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner className="h-4 w-4" />
                      提出中…
                    </span>
                  ) : (
                    "提出する"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
    return previewContent;
  }

  return (
    <UploadLayout title="請求書アップロード">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg shadow-black/5">
        <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 mb-6">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`flex-1 rounded-md py-2 text-body font-medium transition-colors ${
              mode === "single"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            個別
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`flex-1 rounded-md py-2 text-body font-medium transition-colors ${
              mode === "bulk"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            一括
          </button>
        </div>

        {mode === "single" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-1">PDFをアップロード</h2>
            <p className="text-caption text-muted-foreground mb-6">
              ドラッグ＆ドロップまたはクリックしてファイルを選択
            </p>

            <form onSubmit={handleAnalyze} className="space-y-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className={`rounded-xl border-2 border-dashed transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-muted-foreground/40"
                } p-8 flex flex-col items-center justify-center min-h-[180px] cursor-pointer`}
                onClick={() => document.getElementById("upload-pdf-input")?.click()}
              >
                <input
                  id="upload-pdf-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <>
                    <FontAwesomeIcon icon={faFilePdf} className="h-11 w-11 text-primary mb-2" />
                    <p className="text-body font-medium text-foreground">{file.name}</p>
                    <p className="text-caption text-muted-foreground mt-1">クリックまたは別のPDFをドロップで変更</p>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCloudArrowUp} className="h-11 w-11 text-muted-foreground mb-2" />
                    <p className="text-body font-medium text-foreground">PDFを選択</p>
                    <p className="text-caption text-muted-foreground mt-1">ドラッグ＆ドロップまたはクリック</p>
                  </>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-body text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <>
                    <LoadingSpinner className="h-5 w-5" />
                    読み込み中…
                  </>
                ) : (
                  "読み込む"
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-1">一括アップロード</h2>
            <p className="text-caption text-muted-foreground mb-4">
              担当者名を入力し、PDFを複数選択して一括提出します。AIチェックはダッシュボードで実行してください。
            </p>

            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-caption text-muted-foreground mb-1">Timingood担当者名（必須）</label>
                <input
                  type="text"
                  value={bulkSubmitterName}
                  onChange={(e) => setBulkSubmitterName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body"
                  placeholder="弊社担当者"
                />
              </div>

              <div>
                <label className="block text-caption text-muted-foreground mb-1">PDF（複数選択可）</label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setBulkDragOver(true);
                  }}
                  onDragLeave={() => setBulkDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setBulkDragOver(false);
                    handleBulkFiles(e.dataTransfer.files ?? []);
                  }}
                  className={`rounded-xl border-2 border-dashed transition-colors ${
                    bulkDragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-muted-foreground/40"
                  } p-6 flex flex-col items-center justify-center min-h-[120px] cursor-pointer`}
                  onClick={() => document.getElementById("bulk-pdf-input")?.click()}
                >
                  <input
                    id="bulk-pdf-input"
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => handleBulkFiles(e.target.files ?? [])}
                  />
                  <FontAwesomeIcon icon={faCloudArrowUp} className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-body font-medium text-foreground">PDFを選択またはドロップ</p>
                </div>
                {bulkFiles.length > 0 && (
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {bulkFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-body">
                        <FontAwesomeIcon icon={faFilePdf} className="h-4 w-4 text-primary shrink-0" />
                        <span className="min-w-0 truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeBulkFile(i)}
                          className="shrink-0 text-muted-foreground hover:text-destructive text-caption"
                          aria-label="削除"
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-body text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={bulkSubmitting || !bulkSubmitterName.trim() || bulkFiles.length === 0}
                className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                {bulkSubmitting ? (
                  <>
                    <LoadingSpinner className="h-5 w-5" />
                    一括提出中…
                  </>
                ) : (
                  "一括提出"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </UploadLayout>
  );
}
