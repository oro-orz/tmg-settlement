"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import type { Invoice } from "@/lib/types";
import { getDisplayPartnerName, getManagementTypeLabel } from "@/lib/invoiceTypeLabels";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faFolderOpen, faChevronRight, faChevronDown, faFilePdf, faPrint, faSearch } from "@fortawesome/free-solid-svg-icons";

type ViewMode = "month" | "partner";

/** 承認日をフォーマット */
function formatApprovedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function ArchivePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("status", "approved");
    fetch(`/api/invoices?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setInvoices(data.data as Invoice[]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const { yearMonthTree, uniquePartners } = useMemo(() => {
    const byMonth: Record<string, Invoice[]> = {};
    const partners = new Set<string>();
    for (const inv of invoices) {
      const m = inv.targetMonth || "未設定";
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(inv);
      partners.add(getDisplayPartnerName(inv));
    }
    const months = Object.keys(byMonth).sort();
    const tree: Record<string, string[]> = {};
    for (const m of months) {
      const [y] = m.split("-");
      if (!tree[y]) tree[y] = [];
      tree[y].push(m);
    }
    for (const y of Object.keys(tree)) {
      tree[y].sort();
    }
    return {
      yearMonthTree: tree,
      uniquePartners: Array.from(partners).sort((a, b) => a.localeCompare(b, "ja")),
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (selectedMonth) {
      return invoices.filter((inv) => (inv.targetMonth || "未設定") === selectedMonth);
    }
    if (selectedPartner) {
      return invoices.filter((inv) => getDisplayPartnerName(inv) === selectedPartner);
    }
    return [];
  }, [invoices, selectedMonth, selectedPartner]);

  const partnerFiltered = useMemo(() => {
    if (!partnerSearch.trim()) return uniquePartners;
    const q = partnerSearch.trim().toLowerCase();
    return uniquePartners.filter((p) => p.toLowerCase().includes(q));
  }, [uniquePartners, partnerSearch]);

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const handleSelectMonth = (month: string) => {
    setSelectedMonth(month);
    setSelectedPartner("");
  };

  const handleSelectPartner = (partner: string) => {
    setSelectedPartner(partner);
    setSelectedMonth("");
  };

  const clearSelection = () => {
    setSelectedMonth("");
    setSelectedPartner("");
  };

  const leftPanel = (
    <div className="p-4 space-y-4">
      <Link
        href="/dashboard"
        className="text-body text-primary hover:underline"
      >
        ← 経理管理
      </Link>

      <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
        <button
          type="button"
          onClick={() => { setViewMode("month"); clearSelection(); }}
          className={`flex-1 py-2 text-caption font-medium rounded-md transition-colors ${
            viewMode === "month" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          月別
        </button>
        <button
          type="button"
          onClick={() => { setViewMode("partner"); clearSelection(); }}
          className={`flex-1 py-2 text-caption font-medium rounded-md transition-colors ${
            viewMode === "partner" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          取引先
        </button>
      </div>

      {viewMode === "month" && (
        <div className="space-y-1">
          <p className="text-caption font-medium text-muted-foreground mb-2">対象月を選択</p>
          {Object.keys(yearMonthTree).sort().reverse().map((year) => {
            const months = yearMonthTree[year];
            const isOpen = expandedYears.has(year);
            return (
              <div key={year} className="rounded-md border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-body bg-muted/40 hover:bg-muted/60 text-left"
                >
                  <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} className="w-3 h-3 text-muted-foreground" />
                  <FontAwesomeIcon icon={isOpen ? faFolderOpen : faFolder} className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{year}年</span>
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-background">
                    {months.map((month) => (
                      <button
                        key={month}
                        type="button"
                        onClick={() => handleSelectMonth(month)}
                        className={`w-full flex items-center gap-2 px-3 py-2 pl-8 text-body text-left hover:bg-muted/50 ${
                          selectedMonth === month ? "bg-primary/10 text-primary font-medium" : ""
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {Object.keys(yearMonthTree).length === 0 && !loading && (
            <p className="text-caption text-muted-foreground">承認済みがありません</p>
          )}
        </div>
      )}

      {viewMode === "partner" && (
        <div className="space-y-2">
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={partnerSearch}
              onChange={(e) => setPartnerSearch(e.target.value)}
              placeholder="取引先で検索"
              className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-body"
            />
          </div>
          <p className="text-caption font-medium text-muted-foreground">取引先を選択</p>
          <ul className="max-h-[50vh] overflow-y-auto rounded-md border border-border divide-y divide-border">
            {partnerFiltered.map((partner) => (
              <li key={partner}>
                <button
                  type="button"
                  onClick={() => handleSelectPartner(partner)}
                  className={`w-full px-3 py-2 text-left text-body hover:bg-muted/50 ${
                    selectedPartner === partner ? "bg-primary/10 text-primary font-medium" : ""
                  }`}
                >
                  {partner}
                </button>
              </li>
            ))}
            {partnerFiltered.length === 0 && !loading && (
              <li className="px-3 py-4 text-caption text-muted-foreground">該当する取引先がありません</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );

  const centerPanel = (
    <div className="p-4 flex flex-col min-h-0">
      <h1 className="text-xl font-bold text-foreground mb-4">承認済み申請アーカイブ</h1>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : !selectedMonth && !selectedPartner ? (
        <p className="text-body text-muted-foreground py-8">
          左の「月別」で対象月、または「取引先」で会社名を選択すると一覧が表示されます。
        </p>
      ) : filteredInvoices.length === 0 ? (
        <p className="text-body text-muted-foreground py-8">
          {selectedMonth ? "この月の承認済みはありません。" : "この取引先の承認済みはありません。"}
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full border-collapse text-body">
              <thead className="bg-muted/60 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-2.5 px-3 font-semibold text-foreground border-b border-border">対象月</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-foreground border-b border-border">取引先</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-foreground border-b border-border">種別</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-foreground border-b border-border">担当者</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-foreground border-b border-border">承認日</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-foreground border-b border-border w-48">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices
                  .sort((a, b) => {
                    const ma = a.targetMonth || "";
                    const mb = b.targetMonth || "";
                    if (ma !== mb) return mb.localeCompare(ma);
                    return (b.approvedAt || "").localeCompare(a.approvedAt || "");
                  })
                  .map((inv, index) => (
                    <tr
                      key={inv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedInvoiceId(inv.id)}
                      className={`border-b border-border hover:bg-muted/40 cursor-pointer ${
                        index % 2 === 1 ? "bg-muted/20" : ""
                      } ${selectedInvoiceId === inv.id ? "bg-primary/15 ring-1 ring-primary/30" : ""}`}
                    >
                      <td className="py-2 px-3">{inv.targetMonth || "—"}</td>
                      <td className="py-2 px-3">{getDisplayPartnerName(inv)}</td>
                      <td className="py-2 px-3">{getManagementTypeLabel(inv.type)}</td>
                      <td className="py-2 px-3">{inv.submitterName || "—"}</td>
                      <td className="py-2 px-3">{formatApprovedAt(inv.approvedAt)}</td>
                      <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                        <span className="flex items-center gap-3 flex-wrap">
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faPrint} className="w-4 h-4" />
                            印刷・共有
                          </a>
                          <a
                            href={`/api/invoices/${inv.id}/pdf?download=1`}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                            download
                          >
                            <FontAwesomeIcon icon={faFilePdf} className="w-4 h-4" />
                            ダウンロード
                          </a>
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border bg-muted/30 text-caption text-muted-foreground">
            {filteredInvoices.length} 件
          </div>
        </div>
      )}
    </div>
  );

  const rightPanel = (
    <div className="flex flex-col h-full min-h-0 p-4">
      {selectedInvoiceId ? (
        <>
          <p className="text-caption text-muted-foreground mb-2">プレビュー</p>
          <div className="flex-1 min-h-0 rounded-lg border border-border overflow-hidden bg-muted/30">
            <iframe
              title="請求書プレビュー"
              src={`/api/invoices/${selectedInvoiceId}/pdf`}
              className="w-full h-full min-h-[400px]"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <a
              href={`/api/invoices/${selectedInvoiceId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body text-primary hover:underline"
            >
              PDFを新しいタブで開く
            </a>
            <a
              href={`/api/invoices/${selectedInvoiceId}/pdf?download=1`}
              download
              className="text-body text-primary hover:underline"
            >
              ダウンロード
            </a>
          </div>
        </>
      ) : (
        <div className="text-body text-muted-foreground text-caption space-y-2">
          <p className="font-medium text-foreground">プレビュー</p>
          <p>一覧で請求書の行をクリックすると、ここにPDFプレビューが表示されます。</p>
          <p className="font-medium text-foreground mt-4">使い方</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>月別</strong>: 年を開いて月を選ぶと、その月の承認済みが一覧表示されます。</li>
            <li><strong>取引先</strong>: 検索または一覧から会社名を選ぶと、その取引先の過去の承認済みがすべて表示されます。</li>
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <AppShell
      header={
        <Header
          title="経理アーカイブ"
          targetMonth=""
          onMonthChange={() => {}}
          applications={[]}
        />
      }
      left={leftPanel}
      center={centerPanel}
      right={rightPanel}
    />
  );
}
