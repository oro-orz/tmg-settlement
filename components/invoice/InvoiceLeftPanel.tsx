"use client";

import Link from "next/link";
import type { Invoice } from "@/lib/types";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";

/** 表示用ステータス: 3種＋取り込み中 */
function getDisplayStatus(inv: Invoice): string {
  if (inv.status === "ai_checking") return "取り込み中";
  if (inv.status === "returned") return "差し戻し";
  if (inv.status === "approved") return "承認済み";
  return "未処理";
}

/** フィルター用: 未処理=pending, 差し戻し=returned, 承認済み=approved */
const FILTER_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "pending", label: "未処理" },
  { value: "returned", label: "差し戻し" },
  { value: "approved", label: "承認済み" },
] as const;

function filterByDisplayStatus(invoices: Invoice[], filterStatus: string): Invoice[] {
  if (!filterStatus) return invoices;
  if (filterStatus === "pending") {
    return invoices.filter((inv) => inv.status !== "returned" && inv.status !== "approved");
  }
  if (filterStatus === "returned") return invoices.filter((inv) => inv.status === "returned");
  if (filterStatus === "approved") return invoices.filter((inv) => inv.status === "approved");
  return invoices;
}

interface InvoiceLeftPanelProps {
  invoices: Invoice[];
  selectedId: string | null;
  onSelect: (inv: Invoice) => void;
  isLoading: boolean;
  filterStatus: string;
  filterMonth: string;
  onFilterStatus: (v: string) => void;
  onFilterMonth: (v: string) => void;
}

export function InvoiceLeftPanel({
  invoices,
  selectedId,
  onSelect,
  isLoading,
  filterStatus,
  filterMonth,
  onFilterStatus,
  onFilterMonth,
}: InvoiceLeftPanelProps) {
  const months = Array.from(
    new Set(invoices.map((i) => i.targetMonth).filter(Boolean))
  ).sort();

  const filtered = filterByDisplayStatus(invoices, filterStatus);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <h2 className="text-title font-semibold text-foreground">
          請求書一覧 ({filtered.length})
        </h2>
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
          <label className="block text-caption text-muted-foreground mb-1">対象月</label>
          <select
            value={filterMonth}
            onChange={(e) => onFilterMonth(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-body"
          >
            <option value="">すべて</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <Link
          href="/upload"
          className="block w-full text-center rounded-xl border border-primary text-primary py-2 text-body hover:bg-primary/5"
        >
          アップロード
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <EmptyState
            title="請求書がありません"
            description="該当する請求書はありません。アップロードから登録してください。"
          />
        ) : (
          <ul className="space-y-1">
            {filtered.map((inv) => (
              <li key={inv.id}>
                <button
                  type="button"
                  onClick={() => onSelect(inv)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${
                    selectedId === inv.id
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <p className="font-medium text-foreground truncate">{inv.vendorName}</p>
                  <p className="text-caption text-muted-foreground">
                    {inv.targetMonth} · {getDisplayStatus(inv)}
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
