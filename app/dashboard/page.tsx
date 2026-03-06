"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Header, type InvoiceCounts } from "@/components/layout/Header";
import { InvoiceLeftPanel } from "@/components/invoice/InvoiceLeftPanel";
import { InvoiceApprovalArea } from "@/components/invoice/InvoiceApprovalArea";
import type { Invoice, HumanCheckedItems } from "@/lib/types";
import { getManagementTypeLabel, getDisplayPartnerName, getPartnerLabel } from "@/lib/invoiceTypeLabels";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faTrashCan } from "@fortawesome/free-solid-svg-icons";

const HUMAN_CHECK_KEYS: (keyof HumanCheckedItems)[] = [
  "bankBranch",
  "accountName",
  "invoiceNumber",
  "legalName",
  "submitterName",
];

const HUMAN_CHECK_LABELS: Record<keyof HumanCheckedItems, string> = {
  bankBranch: "銀行名・支店名",
  accountName: "口座名義",
  invoiceNumber: "インボイス登録番号",
  legalName: "法人名の正式表記",
  submitterName: "請求者名（誤字・表記ゆれ）",
};

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [humanChecks, setHumanChecks] = useState<Record<string, HumanCheckedItems>>({});
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [aiCheckRunningId, setAiCheckRunningId] = useState<string | null>(null);
  const [aiCheckBulkRunning, setAiCheckBulkRunning] = useState(false);
  const [notifyAccounting, setNotifyAccounting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.set("targetMonth", filterMonth);
      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const list = data.data as Invoice[];
        setInvoices(list);
        setSelectedInvoice((prev) => {
          if (!prev) return list[0] ?? null;
          const found = list.find((i) => i.id === prev.id);
          return found ?? list[0] ?? null;
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [filterMonth]);

  const invoiceCounts: InvoiceCounts = (() => {
    let unprocessed = 0;
    let submitted = 0;
    let approved = 0;
    let returned = 0;
    for (const inv of invoices) {
      if (inv.status === "submitted") submitted++;
      else if (inv.status === "approved") approved++;
      else if (inv.status === "returned") returned++;
      else unprocessed++;
    }
    return { unprocessed, submitted, approved, returned };
  })();

  const handleSelectInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
  };

  const handleHumanCheck = (invoiceId: string, key: keyof HumanCheckedItems, value: boolean) => {
    setHumanChecks((prev) => {
      const cur = prev[invoiceId] ?? {
        bankBranch: false,
        accountName: false,
        invoiceNumber: false,
        legalName: false,
        submitterName: false,
      };
      return { ...prev, [invoiceId]: { ...cur, [key]: value } };
    });
  };

  const getHumanChecked = (inv: Invoice): HumanCheckedItems => {
    return humanChecks[inv.id] ?? inv.humanChecked ?? {
      bankBranch: false,
      accountName: false,
      invoiceNumber: false,
      legalName: false,
      submitterName: false,
    };
  };

  const canSubmitToAccounting = (inv: Invoice): boolean => {
    if (inv.status !== "ai_ok" && inv.status !== "needs_fix") return false;
    const h = getHumanChecked(inv);
    return HUMAN_CHECK_KEYS.every((k) => h[k] === true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/invoices/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        await fetchList();
      } else {
        alert(data.message ?? "削除に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      setDeleteLoading(false);
    }
  };

  const pendingInvoices = invoices.filter((inv) => inv.status === "pending");

  const handleRunAiCheck = async (invoiceId: string) => {
    setAiCheckRunningId(invoiceId);
    try {
      const res = await fetch("/api/invoices/ai-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchList();
      } else {
        alert(data.message ?? "AIチェックに失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      setAiCheckRunningId(null);
    }
  };

  const handleRunAllPendingChecks = async () => {
    if (pendingInvoices.length === 0) return;
    setAiCheckBulkRunning(true);
    try {
      for (const inv of pendingInvoices) {
        const res = await fetch("/api/invoices/ai-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: inv.id }),
        });
        const data = await res.json();
        if (!data.success) {
          alert(`${inv.fileName ?? inv.id}: ${data.message ?? "AIチェックに失敗しました"}`);
        }
      }
      await fetchList();
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      setAiCheckBulkRunning(false);
    }
  };

  const handleSubmitToAccounting = async (inv: Invoice) => {
    if (!canSubmitToAccounting(inv)) return;
    setSubmittingId(inv.id);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "submitted",
          humanChecked: getHumanChecked(inv),
          notifyAccounting,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchList();
      } else {
        alert(data.message ?? "送信に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      setSubmittingId(null);
    }
  };

  const displayStatusLabel =
    selectedInvoice?.status === "pending"
      ? "AIチェック未実施"
      : selectedInvoice?.status === "ai_checking"
        ? "取り込み中"
        : selectedInvoice?.status === "returned"
          ? "差し戻し"
          : selectedInvoice?.status === "approved"
            ? "承認済み"
            : "未処理";

  const centerContent = selectedInvoice ? (
    <div className="p-4 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between flex-shrink-0 mb-3">
        <h1 className="text-xl font-bold text-foreground">申請詳細</h1>
        <div className="flex items-center gap-2">
          <a
            href={`/api/invoices/${selectedInvoice.id}/pdf?download=1`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-body font-medium hover:bg-muted transition-colors"
            download
          >
            <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
            ダウンロード
          </a>
          <a
            href={`/api/invoices/${selectedInvoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-primary text-primary px-4 py-2 text-body font-medium hover:bg-primary/5 transition-colors"
          >
            印刷・共有
          </a>
          <button
            type="button"
            onClick={() => setDeleteTarget(selectedInvoice)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive px-4 py-2 text-body font-medium hover:bg-destructive/20 transition-colors"
            aria-label="削除"
          >
            <FontAwesomeIcon icon={faTrashCan} className="h-4 w-4" />
            削除
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {selectedInvoice.filePath ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden flex-1 min-h-[300px] flex flex-col">
            <p className="text-caption text-muted-foreground px-4 py-2 border-b border-border">PDF</p>
            <div className="flex-1 min-h-0">
              <iframe
                src={`/api/invoices/${selectedInvoice.id}/pdf`}
                title="請求書PDF"
                className="w-full h-full min-h-[280px]"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[200px] flex items-center justify-center text-muted-foreground text-body">
            PDFはありません
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full min-h-[200px] text-body text-muted-foreground">
      左の一覧から申請を選択してください
    </div>
  );

  const rightDetailBlock = selectedInvoice ? (
    <div className="p-4 space-y-4 border-b border-border">
      <div className="space-y-2">
        <p><span className="text-caption text-muted-foreground">{getPartnerLabel(selectedInvoice.type)}</span><br />{getDisplayPartnerName(selectedInvoice, selectedInvoice.status === "pending" ? "—（AIチェック後に表示）" : "—")}</p>
        <p><span className="text-caption text-muted-foreground">Timingood担当者</span><br />{selectedInvoice.submitterName}</p>
        {selectedInvoice.email ? (
          <p><span className="text-caption text-muted-foreground">メール</span><br />{selectedInvoice.email}</p>
        ) : null}
        <p><span className="text-caption text-muted-foreground">対象月</span><br />{selectedInvoice.targetMonth || (selectedInvoice.status === "pending" ? "—（AIチェック後に表示）" : "—")}</p>
        <p><span className="text-caption text-muted-foreground">種別</span><br />{getManagementTypeLabel(selectedInvoice.type)}</p>
        <p><span className="text-caption text-muted-foreground">ステータス</span><br />{displayStatusLabel}</p>
      </div>
      {selectedInvoice.aiResult && (
        <div>
          <h2 className="text-body font-semibold text-foreground mb-2">確認結果</h2>
          <ul className="space-y-1 text-body text-muted-foreground">
            {selectedInvoice.aiResult.checks.map((c) => (
              <li key={c.id} className={c.ok ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                {c.label}: {c.ok ? "OK" : (c.reason ?? "NG")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ) : null;

  const rightContent = selectedInvoice ? (
    <div className="flex flex-col h-full overflow-y-auto">
      {rightDetailBlock}
      <div className="p-4 flex-1">
        {(selectedInvoice.status === "ai_ok" || selectedInvoice.status === "needs_fix") ? (
          <div className="space-y-4">
            <p className="text-caption text-muted-foreground">
              留意項目を全て確認のうえ「提出」を押してください。
            </p>
            <div className="space-y-2">
              {HUMAN_CHECK_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-body cursor-pointer"
                >
                  <Checkbox
                    checked={getHumanChecked(selectedInvoice)[key]}
                    onCheckedChange={(c) =>
                      handleHumanCheck(selectedInvoice.id, key, c === true)
                    }
                  />
                  {HUMAN_CHECK_LABELS[key]}
                </label>
              ))}
              <label className="flex items-center gap-2 text-body cursor-pointer">
                <Checkbox
                  checked={notifyAccounting}
                  onCheckedChange={(c) => setNotifyAccounting(c === true)}
                />
                経理に通知する
              </label>
            </div>
            <Button
              className="w-full rounded-xl bg-primary"
              disabled={!canSubmitToAccounting(selectedInvoice) || submittingId === selectedInvoice.id}
              onClick={() => handleSubmitToAccounting(selectedInvoice)}
            >
              {submittingId === selectedInvoice.id ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                "提出"
              )}
            </Button>
          </div>
        ) : selectedInvoice.status === "submitted" ? (
          <InvoiceApprovalArea invoice={selectedInvoice} onSubmitted={fetchList} />
        ) : selectedInvoice.status === "pending" ? (
          <div className="space-y-4">
            <p className="text-caption text-muted-foreground">
              一括アップロードされた申請です。AIチェックを実行すると請求元名・対象月を抽出し、確認項目を判定します。
            </p>
            <Button
              className="w-full rounded-xl bg-primary"
              disabled={aiCheckRunningId !== null || aiCheckBulkRunning}
              onClick={() => handleRunAiCheck(selectedInvoice.id)}
            >
              {aiCheckRunningId === selectedInvoice.id ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                "AIチェック実行"
              )}
            </Button>
            {pendingInvoices.length > 1 && (
              <Button
                variant="outline"
                className="w-full rounded-xl"
                disabled={aiCheckRunningId !== null || aiCheckBulkRunning}
                onClick={handleRunAllPendingChecks}
              >
                {aiCheckBulkRunning ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  `未チェックを一括実行（${pendingInvoices.length}件）`
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-body text-muted-foreground">
            <p className="text-caption font-medium text-foreground mb-2">操作説明</p>
            <ul className="list-disc list-inside space-y-1 text-caption">
              {selectedInvoice.status === "ai_checking" || selectedInvoice.status === "draft" ? (
                <li>取り込み完了後に留意項目の確認と経理提出ができます</li>
              ) : selectedInvoice.status === "returned" || selectedInvoice.status === "approved" ? (
                <li>経理レビュー済みです。差し戻し理由等は印刷・共有でPDFを開いて確認できます</li>
              ) : null}
            </ul>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="p-4 flex flex-col gap-4 text-body text-muted-foreground">
      <div>
        <p className="text-caption font-medium text-foreground mb-2">操作説明</p>
        <ul className="list-disc list-inside space-y-1 text-caption">
          <li>左の一覧から申請を選択すると、中央にPDF・詳細、右に操作が表示されます</li>
          <li>未処理の申請は、留意5項目にチェックを入れて「提出」を押してください</li>
          <li>経理提出済みの申請は、承認・差し戻しができます</li>
        </ul>
      </div>
      {pendingInvoices.length > 0 && (
        <Button
          variant="outline"
          className="w-full rounded-xl"
          disabled={aiCheckBulkRunning}
          onClick={handleRunAllPendingChecks}
        >
          {aiCheckBulkRunning ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            `未チェックを一括実行（${pendingInvoices.length}件）`
          )}
        </Button>
      )}
    </div>
  );

  return (
    <>
    <AppShell
      header={
        <Header
          title="経理管理"
          targetMonth={filterMonth ?? ""}
          onMonthChange={(m) => setFilterMonth(m || "")}
          applications={[]}
          invoiceCounts={invoiceCounts}
        />
      }
      left={
        <InvoiceLeftPanel
          invoices={invoices}
          selectedId={selectedInvoice?.id ?? null}
          onSelect={handleSelectInvoice}
          isLoading={loading}
          filterStatus={filterStatus}
          filterType={filterType}
          onFilterStatus={setFilterStatus}
          onFilterType={setFilterType}
        />
      }
      center={centerContent}
      right={rightContent}
    />
    <ConfirmModal
      open={deleteTarget !== null}
      title="申請を削除"
      message={deleteTarget ? `「${getDisplayPartnerName(deleteTarget, deleteTarget.id)}」${deleteTarget.targetMonth ? `（${deleteTarget.targetMonth}）` : ""}を削除しますか？この操作は取り消せません。` : ""}
      confirmLabel="削除する"
      cancelLabel="キャンセル"
      variant="destructive"
      onConfirm={handleDeleteConfirm}
      onCancel={() => setDeleteTarget(null)}
      isLoading={deleteLoading}
    />
    </>
  );
}
