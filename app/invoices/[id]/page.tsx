"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { InvoiceApprovalArea } from "@/components/invoice/InvoiceApprovalArea";
import type { Invoice } from "@/lib/types";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/free-solid-svg-icons";

function getDisplayStatus(inv: Invoice): string {
  if (inv.status === "ai_checking") return "取り込み中";
  if (inv.status === "returned") return "差し戻し";
  if (inv.status === "approved") return "承認済み";
  return "未処理";
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setInvoice(data.data);
        setError(null);
      } else {
        setError(data.message ?? "取得に失敗しました");
      }
    } catch {
      setError("通信エラー");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchInvoice();
    else setLoading(false);
  }, [id]);

  if (!id) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-body text-muted-foreground">URLが不正です</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-body text-destructive">{error ?? "データがありません"}</p>
        <Link href="/dashboard" className="text-primary hover:underline">一覧へ戻る</Link>
      </div>
    );
  }

  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;

  return (
    <AppShell
      header={
        <Header
          title="請求書管理"
          targetMonth={invoice.targetMonth}
          onMonthChange={() => {}}
          applications={[]}
        />
      }
      left={
        <div className="p-4">
          <Link
            href="/dashboard"
            className="text-body text-primary hover:underline"
          >
            ← 請求書管理
          </Link>
        </div>
      }
      center={
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FontAwesomeIcon icon={faPrint} className="text-primary" />
            印刷・共有
          </h1>
          <div className="rounded-lg border border-border bg-card p-4">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 font-medium hover:opacity-90"
            >
              <FontAwesomeIcon icon={faPrint} />
              PDFを開く
            </a>
            <p className="text-caption text-muted-foreground mt-2">
              ログイン済みの方が閲覧できます。新しいタブで開きます。
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p><span className="text-caption text-muted-foreground">請求元名</span> {invoice.vendorName}</p>
            <p><span className="text-caption text-muted-foreground">Timingood担当者</span> {invoice.submitterName}</p>
            {invoice.email && (
              <p><span className="text-caption text-muted-foreground">メール</span> {invoice.email}</p>
            )}
            <p><span className="text-caption text-muted-foreground">対象月</span> {invoice.targetMonth}</p>
            <p><span className="text-caption text-muted-foreground">ステータス</span> {getDisplayStatus(invoice)}</p>
          </div>
          {invoice.aiResult && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-body font-semibold text-foreground mb-2">確認結果</h2>
              <ul className="space-y-1 text-body text-muted-foreground">
                {invoice.aiResult.checks.map((c) => (
                  <li key={c.id} className={c.ok ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                    {c.label}: {c.ok ? "OK" : (c.reason ?? "NG")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
      right={
        <div className="p-4">
          <InvoiceApprovalArea invoice={invoice} onSubmitted={fetchInvoice} />
        </div>
      }
    />
  );
}
