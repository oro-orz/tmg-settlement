"use client";

import Link from "next/link";
import type { Invoice } from "@/lib/types";
import { getManagementTypeLabel, getDisplayPartnerName, MANAGEMENT_TYPE_LABELS } from "@/lib/invoiceTypeLabels";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";

/** 表示用ステータス: pending / 取り込み中 / 差し戻し / 承認済み / 未処理 */
function getDisplayStatus(inv: Invoice): string {
  if (inv.status === "pending") return "AIチェック未実施";
  if (inv.status === "ai_checking") return "取り込み中";
  if (inv.status === "returned") return "差し戻し";
  if (inv.status === "approved") return "承認済み";
  return "未処理";
}

/** フィルター用: すべて / AIチェック未実施 / 未処理 / 差し戻し / 承認済み */
const FILTER_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "pending", label: "AIチェック未実施" },
  { value: "unprocessed", label: "未処理" },
  { value: "returned", label: "差し戻し" },
  { value: "approved", label: "承認済み" },
] as const;

/** 種別フィルター用 */
const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "すべて" },
  ...(Object.entries(MANAGEMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))),
];

function filterByDisplayStatus(invoices: Invoice[], filterStatus: string): Invoice[] {
  if (!filterStatus) return invoices;
  if (filterStatus === "pending") {
    return invoices.filter((inv) => inv.status === "pending");
  }
  if (filterStatus === "unprocessed") {
    return invoices.filter((inv) => inv.status !== "returned" && inv.status !== "approved");
  }
  if (filterStatus === "returned") return invoices.filter((inv) => inv.status === "returned");
  if (filterStatus === "approved") return invoices.filter((inv) => inv.status === "approved");
  return invoices;
}

function filterByType(invoices: Invoice[], filterType: string): Invoice[] {
  if (!filterType) return invoices;
  return invoices.filter((inv) => inv.type === filterType);
}

interface InvoiceLeftPanelProps {
  invoices: Invoice[];
  selectedId: string | null;
  onSelect: (inv: Invoice) => void;
  isLoading: boolean;
  filterStatus: string;
  filterType: string;
  onFilterStatus: (v: string) => void;
  onFilterType: (v: string) => void;
}

export function InvoiceLeftPanel({
  invoices,
  selectedId,
  onSelect,
  isLoading,
  filterStatus,
  filterType,
  onFilterStatus,
  onFilterType,
}: InvoiceLeftPanelProps) {
  const filtered = filterByType(filterByDisplayStatus(invoices, filterStatus), filterType);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border border-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border space-y-3">
        <h2 className="text-title font-semibold text-foreground">
          申請一覧 ({filtered.length})
        </h2>
        <Link
          href="/upload"
          className="block w-full text-center rounded-xl bg-primary text-primary-foreground py-2 text-body font-medium hover:opacity-90 transition-opacity"
        >
          アップロード
        </Link>
        <div>
          <label className="block text-caption text-muted-foreground mb-1">ステータス</label>
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatus(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-body"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-caption text-muted-foreground mb-1">種別</label>
          <select
            value={filterType}
            onChange={(e) => onFilterType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-body"
          >
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="申請がありません"
              description="該当する申請はありません。アップロードから登録してください。"
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((inv) => (
              <li key={inv.id}>
                <button
                  type="button"
                  onClick={() => onSelect(inv)}
                  className={`w-full text-left px-3 py-2.5 transition-colors border-l-2 ${
                    selectedId === inv.id
                      ? "bg-primary/10 text-primary border-primary"
                      : "hover:bg-muted/50 border-transparent"
                  }`}
                >
                  <p className="font-medium text-foreground truncate">
                    {getDisplayPartnerName(inv)}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {getManagementTypeLabel(inv.type)}
                    {inv.targetMonth ? ` · ${inv.targetMonth}` : ""} · {getDisplayStatus(inv)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
